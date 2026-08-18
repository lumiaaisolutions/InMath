"use server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { ahoraPared } from "@/lib/fechas";
import { agendar } from "@/lib/agenda";
import { upsertPorTelefono, normalizaTelefono } from "@/lib/prospectos";
import { responderGemini, type Turno } from "@/lib/gemini";
import { Prisma } from "@/generated/prisma/client";
import { cerrarSesion, requiereSesion, requiereAdmin, requiereModulo } from "@/lib/panel/sesion";
import { dirImgPanel } from "@/lib/panel/media";
import { enviarCorreo } from "@/lib/correo";
import { dinero } from "@/lib/panel/formato";

export type Resultado = { ok?: string; error?: string };

const ETAPAS = ["prospecto", "calificado", "cita_agendada", "pago_pendiente", "inscrito", "descartado"] as const;
type Etapa = (typeof ETAPAS)[number];

export async function logoutAccion(): Promise<void> {
  await cerrarSesion();
  redirect("/panel/login");
}

/** Port de /accion/etapa (lo usa el drag&drop y el detalle). */
export async function cambiarEtapaAccion(prospectoId: number, etapa: string): Promise<Resultado> {
  const u = await requiereSesion();
  if (!ETAPAS.includes(etapa as Etapa)) return { error: "Etapa inválida" };
  const actual = await prisma.prospectos.findUnique({ where: { id: prospectoId }, select: { etapa: true } });
  if (actual && actual.etapa !== etapa) {
    await prisma.prospectos.update({ where: { id: prospectoId }, data: { etapa: etapa as Etapa } });
    await prisma.bitacora_pipeline.create({
      data: { prospecto_id: prospectoId, etapa_anterior: actual.etapa, etapa_nueva: etapa as Etapa, origen: "asesor", usuario_id: u.id, nota: "Cambio manual desde el panel" },
    });
  }
  revalidatePath("/panel"); revalidatePath(`/panel/prospectos/${prospectoId}`);
  return { ok: "Etapa actualizada" };
}

/** Port de ProspectoServicio::asignar (FOR UPDATE + asesor_id IS NULL). */
export async function asignarAccion(prospectoId: number, asesorId: number | null): Promise<Resultado> {
  await requiereSesion();
  const r = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM usuarios WHERE es_asesor = 1 AND activo = 1 FOR UPDATE`;
    let elegido = asesorId;
    if (elegido !== null) {
      const ok = await tx.usuarios.findFirst({ where: { id: elegido, es_asesor: true, activo: true }, select: { id: true } });
      if (!ok) return { error: "Asesor inexistente o inactivo" };
    } else {
      const filas = await tx.$queryRaw<{ id: number }[]>`
        SELECT u.id FROM usuarios u
        LEFT JOIN prospectos p ON p.asesor_id = u.id AND p.etapa NOT IN ('inscrito','descartado')
        WHERE u.es_asesor = 1 AND u.activo = 1
        GROUP BY u.id ORDER BY COUNT(p.id) ASC, u.id ASC LIMIT 1`;
      if (!filas.length) return { error: "No hay asesores activos" };
      elegido = Number(filas[0].id);
    }
    const n = await tx.prospectos.updateMany({
      where: { id: prospectoId, asesor_id: null },
      data: { asesor_id: elegido, asignado_en: ahoraPared() },
    });
    if (n.count === 0) return { error: "El prospecto ya tiene asesor asignado" };
    return { ok: "Asesor asignado" };
  });
  revalidatePath("/panel"); revalidatePath(`/panel/prospectos/${prospectoId}`);
  return r;
}

/** Port de /accion/reasignar: decisión humana, sobreescribe. */
export async function reasignarAccion(prospectoId: number, asesorId: number): Promise<Resultado> {
  await requiereSesion();
  await prisma.prospectos.update({ where: { id: prospectoId }, data: { asesor_id: asesorId, asignado_en: ahoraPared() } });
  revalidatePath("/panel"); revalidatePath(`/panel/prospectos/${prospectoId}`);
  return { ok: "Prospecto reasignado" };
}

/** Port de /accion/conversacion (tomar / devolver al bot). */
export async function conversacionAccion(conversacionId: number, estado: "bot" | "asesor"): Promise<Resultado> {
  const u = await requiereSesion();
  await prisma.conversaciones.update({
    where: { id: conversacionId },
    data: { estado, asesor_id: estado === "asesor" ? u.id : null },
  });
  revalidatePath("/panel/prospectos");
  return { ok: estado === "asesor" ? "Tomaste la conversación; el bot queda en pausa." : "El bot retomó la conversación." };
}

/** Port de /accion/mensaje-asesor: registra nota; el envío real lo hace n8n. */
export async function mensajeAsesorAccion(conversacionId: number, contenido: string): Promise<Resultado> {
  await requiereSesion();
  const texto = contenido.trim();
  if (!texto) return {};
  await prisma.mensajes.create({
    data: { conversacion_id: conversacionId, direccion: "saliente", emisor: "asesor", tipo: "texto", contenido: texto },
  });
  revalidatePath("/panel/prospectos");
  return { ok: "Mensaje registrado" };
}

/** Port de /accion/generar-link (reutiliza pendiente o cae a transferencia). */
export async function generarLinkAccion(prospectoId: number): Promise<Resultado> {
  await requiereSesion();
  const prospecto = await prisma.prospectos.findUnique({ where: { id: prospectoId } });
  if (!prospecto) return { error: "Prospecto no encontrado" };
  const curso = prospecto.curso_interes_id
    ? await prisma.cursos.findFirst({ where: { id: prospecto.curso_interes_id, activo: true } })
    : await prisma.cursos.findFirst({ where: { activo: true }, orderBy: { id: "asc" } });
  if (!curso) return { error: "No hay curso activo para cobrar" };
  const { pagoParaProspecto } = await import("@/lib/pagos");
  const pago = await pagoParaProspecto(prospectoId, curso);
  revalidatePath(`/panel/prospectos/${prospectoId}`);
  return { ok: pago.link_pago ? `Link de pago listo: ${pago.link_pago}` : "Pago por transferencia registrado (sin procesador en línea configurado)" };
}

/** Port de /accion/cita-estado. */
export async function citaEstadoAccion(citaId: number, estado: string): Promise<Resultado> {
  await requiereSesion();
  const validos = ["agendada", "confirmada", "completada", "cancelada", "no_asistio"];
  if (!validos.includes(estado)) return { error: "Estado inválido" };
  await prisma.citas.update({ where: { id: citaId }, data: { estado: estado as never } });
  revalidatePath("/panel/citas");
  return { ok: "Cita actualizada" };
}

/** Port de /accion/cita-crear (alta manual con upsert de prospecto). */
export async function citaCrearAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  await requiereModulo("citas");
  const nombre = String(fd.get("nombre") ?? "").trim();
  const telefono = normalizaTelefono(String(fd.get("telefono") ?? ""));
  const inicio = `${fd.get("fecha") ?? ""} ${fd.get("hora") ?? ""}`.trim();
  if (!nombre || !telefono || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(inicio)) {
    return { error: "Nombre, WhatsApp válido, fecha y hora son obligatorios" };
  }
  const { prospecto } = await upsertPorTelefono(telefono, { nombre, fuente: "manual" });
  const asesorId = fd.get("asesor_id") ? parseInt(String(fd.get("asesor_id")), 10) : null;
  const r = await agendar(prospecto.id, inicio, asesorId);
  revalidatePath("/panel/citas");
  return "error" in r ? { error: r.error } : { ok: "Cita registrada" };
}

/** Port de /accion/alumno-crear (alta manual sin pasar por el pipeline). */
export async function alumnoCrearAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  await requiereModulo("alumnos");
  const nombre = String(fd.get("nombre") ?? "").trim();
  const telefono = normalizaTelefono(String(fd.get("telefono") ?? ""));
  const cursoId = parseInt(String(fd.get("curso_id") ?? "0"), 10);
  if (!nombre || !telefono || cursoId < 1) return { error: "Nombre, WhatsApp válido y curso son obligatorios" };
  const { prospecto } = await upsertPorTelefono(telefono, { nombre, fuente: "manual" });
  await prisma.prospectos.update({ where: { id: prospecto.id }, data: { nombre, etapa: "inscrito" } });
  const ya = await prisma.alumnos.findUnique({ where: { prospecto_id: prospecto.id } });
  if (ya) return { error: "Ese teléfono ya está inscrito como alumno" };
  await prisma.alumnos.create({
    data: { prospecto_id: prospecto.id, curso_id: cursoId, nombre, telefono, canal_reporte: "whatsapp", estado: "activo", inscrito_en: ahoraPared() },
  });
  revalidatePath("/panel/alumnos");
  return { ok: "Alumno registrado" };
}

/** Cancela un pago pendiente a mano (el admin verificó que no se completó). */
export async function pagoCancelarAccion(pagoId: number): Promise<Resultado> {
  await requiereModulo("pagos");
  const n = await prisma.pagos.updateMany({
    where: { id: pagoId, estado: "pendiente" },
    data: { estado: "cancelado" },
  });
  if (n.count === 0) return { error: "Ese pago ya no está pendiente" };
  revalidatePath("/panel/pagos");
  return { ok: "Pago cancelado" };
}

/** Port de /accion/pago-aprobar: marca pagado e inscribe (idempotente).
 *  No exige comprobante: el admin puede confirmar un pago que verificó por
 *  otro medio (ej. estado de cuenta). */
export async function pagoAprobarAccion(pagoId: number): Promise<Resultado> {
  await requiereModulo("pagos");
  const pago = await prisma.pagos.findUnique({ where: { id: pagoId } });
  if (!pago || pago.estado !== "pendiente") return { error: "Ese pago no se puede aprobar" };
  const n = await prisma.pagos.updateMany({
    where: { id: pagoId, estado: "pendiente" },
    data: { estado: "pagado", pagado_en: ahoraPared() },
  });
  if (n.count === 0) return { error: "Ese pago ya fue procesado por alguien más" };

  // Port de InscripcionServicio::porPago (UNIQUE prospecto_id absorbe carreras)
  const prospecto = (await prisma.prospectos.findUnique({ where: { id: pago.prospecto_id } }))!;
  let alumnoId: number;
  try {
    const alumno = await prisma.alumnos.create({
      data: {
        prospecto_id: prospecto.id, curso_id: pago.curso_id,
        nombre: prospecto.nombre ?? `Alumno ${prospecto.telefono_whatsapp}`,
        telefono: prospecto.telefono_whatsapp, inscrito_en: ahoraPared(),
      },
    });
    alumnoId = alumno.id;
  } catch (e: unknown) {
    if ((e as { code?: string }).code !== "P2002") throw e;
    alumnoId = (await prisma.alumnos.findUnique({ where: { prospecto_id: prospecto.id } }))!.id;
  }
  await prisma.pagos.update({ where: { id: pagoId }, data: { alumno_id: alumnoId } });
  if (prospecto.etapa !== "inscrito") {
    await prisma.prospectos.update({ where: { id: prospecto.id }, data: { etapa: "inscrito" } });
    await prisma.bitacora_pipeline.create({
      data: { prospecto_id: prospecto.id, etapa_anterior: prospecto.etapa, etapa_nueva: "inscrito", origen: "sistema", nota: `Pago #${pagoId} confirmado` },
    });
  }
  // Credenciales del alumno (usuario = su WhatsApp), como en el PHP
  let aviso = "Pago aprobado y alumno inscrito.";
  const alumno = await prisma.alumnos.findUnique({ where: { id: alumnoId } });
  if (alumno && alumno.usuario === null) {
    const passTmp = randomBytes(8).toString("base64url").replace(/[-_]/g, "x").slice(0, 10);
    await prisma.alumnos.update({
      where: { id: alumnoId },
      data: { usuario: prospecto.telefono_whatsapp, password_hash: await bcrypt.hash(passTmp, 10) },
    });
    aviso += ` Usuario: ${prospecto.telefono_whatsapp} · Contraseña temporal: ${passTmp} — compártela por WhatsApp.`;
  }
  if (prospecto.correo) {
    const curso = await prisma.cursos.findUnique({ where: { id: pago.curso_id }, select: { nombre: true } });
    await enviarCorreo({
      para: [prospecto.correo],
      asunto: "¡Tu pago fue confirmado! — Cursos InMath",
      texto: `Hola ${prospecto.nombre ?? ""},\n\nConfirmamos tu pago de ${dinero(pago.monto_centavos, pago.moneda)} por ${curso?.nombre ?? "tu curso"}. Tu inscripción ya está activa.\n\nEn breve te contactamos por WhatsApp con tus datos de acceso.`,
    });
  }
  revalidatePath("/panel/pagos"); revalidatePath("/panel/alumnos"); revalidatePath("/panel");
  return { ok: aviso };
}

/** Port de /accion/config (solo admin). */
export async function configGuardarAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const u = await requiereAdmin();
  await prisma.configuraciones.update({
    where: { clave: String(fd.get("clave") ?? "") },
    data: { valor: String(fd.get("valor") ?? ""), actualizado_por: u.id },
  });
  revalidatePath("/panel/configuracion");
  return { ok: "Configuración guardada" };
}

/** Port de /accion/usuario-crear. */
export async function usuarioCrearAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  await requiereAdmin();
  const nombre = String(fd.get("nombre") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!nombre || !/.+@.+\..+/.test(email) || password.length < 8) {
    return { error: "Nombre, correo válido y contraseña de 8+ caracteres son obligatorios" };
  }
  if (await prisma.usuarios.findUnique({ where: { email } })) return { error: "Ya existe un usuario con ese correo" };
  await prisma.usuarios.create({
    data: { nombre, email, password_hash: await bcrypt.hash(password, 10), rol: fd.get("rol") === "admin" ? "admin" : "asesor", activo: true },
  });
  revalidatePath("/panel/usuarios");
  return { ok: "Usuario creado" };
}

/** Port de /accion/usuario-guardar (con salvaguardas de auto-bloqueo). */
export async function usuarioGuardarAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const yo = await requiereAdmin();
  const uid = parseInt(String(fd.get("usuario_id") ?? "0"), 10);
  const objetivo = await prisma.usuarios.findUnique({ where: { id: uid } });
  if (!objetivo) return { error: "Usuario no encontrado" };
  const nombre = String(fd.get("nombre") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim();
  const rol = fd.get("rol") === "admin" ? "admin" : "asesor";
  const activo = fd.get("activo") != null;
  if (!nombre || !/.+@.+\..+/.test(email)) return { error: "Nombre y correo válidos son obligatorios" };
  if (uid === yo.id && (rol !== "admin" || !activo)) return { error: "No puedes quitarte el acceso a ti mismo" };
  const modulosValidos = ["pipeline", "citas", "alumnos", "pagos"];
  const modulos = fd.getAll("modulos").map(String).filter((m) => modulosValidos.includes(m));
  await prisma.usuarios.update({
    where: { id: uid },
    data: {
      nombre, email, telefono: String(fd.get("telefono") ?? "").trim() || null,
      rol, activo, es_asesor: fd.get("es_asesor") != null,
      modulos: modulos.length === modulosValidos.length ? Prisma.DbNull : modulos,
    },
  });
  const password = String(fd.get("password") ?? "");
  if (password !== "") {
    if (password.length < 8) return { error: "La contraseña nueva debe tener al menos 8 caracteres" };
    await prisma.usuarios.update({ where: { id: uid }, data: { password_hash: await bcrypt.hash(password, 10) } });
  }
  revalidatePath("/panel/usuarios");
  return { ok: "Usuario actualizado" };
}

/** Port de /accion/usuario-eliminar: baja lógica. */
export async function usuarioEliminarAccion(usuarioId: number): Promise<Resultado> {
  const yo = await requiereAdmin();
  if (usuarioId === yo.id) return { error: "No puedes eliminarte a ti mismo" };
  await prisma.usuarios.update({ where: { id: usuarioId }, data: { activo: false, es_asesor: false } });
  revalidatePath("/panel/usuarios");
  return { ok: "Usuario eliminado (acceso revocado)" };
}

/** Port de /accion/perfil. */
export async function perfilGuardarAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const yo = await requiereSesion();
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!nombre) return { error: "Escribe tu nombre" };
  await prisma.usuarios.update({
    where: { id: yo.id },
    data: { nombre, telefono: String(fd.get("telefono") ?? "").trim() || null },
  });
  const p1 = String(fd.get("password") ?? "");
  if (p1 !== "") {
    if (p1.length < 8) return { error: "La contraseña nueva debe tener al menos 8 caracteres" };
    if (p1 !== String(fd.get("password2") ?? "")) return { error: "Las contraseñas no coinciden" };
    await prisma.usuarios.update({ where: { id: yo.id }, data: { password_hash: await bcrypt.hash(p1, 10) } });
  }
  revalidatePath("/panel/perfil");
  return { ok: "Perfil actualizado" };
}

/** Port de /accion/perfil-foto: recorte cover 512×512 con sharp. */
export async function perfilFotoAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const yo = await requiereSesion();
  const foto = fd.get("foto");
  if (!(foto instanceof File) || foto.size === 0) return { error: "Elige una imagen válida" };
  if (foto.size > 8 * 1024 * 1024) return { error: "Solo JPG, PNG o WebP de hasta 8 MB" };
  const dir = path.join(dirImgPanel(), "avatars");
  await mkdir(dir, { recursive: true });
  try {
    await sharp(Buffer.from(await foto.arrayBuffer()))
      .resize(512, 512, { fit: "cover" }).jpeg({ quality: 88 })
      .toFile(path.join(dir, `${yo.id}.jpg`));
  } catch { return { error: "No pudimos procesar esa imagen" }; }
  revalidatePath("/panel/perfil");
  return { ok: "Foto de perfil actualizada" };
}

/** Port de /accion/prompt: cada edición crea versión nueva y la activa. */
export async function promptGuardarAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const u = await requiereAdmin();
  const clave = String(fd.get("clave") ?? "sistema_bot");
  const contenido = String(fd.get("contenido") ?? "").trim();
  if (!contenido) return { error: "El prompt no puede quedar vacío" };
  await prisma.$transaction(async (tx) => {
    const ultima = await tx.prompts.aggregate({ where: { clave }, _max: { version: true } });
    await tx.prompts.updateMany({ where: { clave }, data: { activo: false } });
    await tx.prompts.create({
      data: {
        clave, contenido, version: (ultima._max.version ?? 0) + 1, activo: true,
        notas: String(fd.get("notas") ?? "") || "Editado desde el panel", actualizado_por: u.id,
      },
    });
  });
  revalidatePath("/panel/prompts");
  return { ok: "Nueva versión del prompt activada" };
}

/** Port de /accion/prompt-activar. */
export async function promptActivarAccion(promptId: number): Promise<Resultado> {
  await requiereAdmin();
  await prisma.$transaction(async (tx) => {
    const p = await tx.prompts.findUnique({ where: { id: promptId } });
    if (p) {
      await tx.prompts.updateMany({ where: { clave: p.clave }, data: { activo: false } });
      await tx.prompts.update({ where: { id: promptId }, data: { activo: true } });
    }
  });
  revalidatePath("/panel/prompts");
  return { ok: "Versión activada" };
}

/** Port de /accion/login-textos. */
export async function loginTextosAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const u = await requiereAdmin();
  const textos: Record<string, string> = {
    login_titulo: "Título de bienvenida en la pantalla de inicio de sesión.",
    login_texto: "Texto de apoyo bajo el título del inicio de sesión.",
  };
  for (const [clave, descripcion] of Object.entries(textos)) {
    const valor = String(fd.get(clave) ?? "").trim();
    await prisma.configuraciones.upsert({
      where: { clave },
      create: { clave, valor, tipo: "texto", descripcion },
      update: { valor, actualizado_por: u.id },
    });
  }
  revalidatePath("/panel/personalizar-login"); revalidatePath("/panel/login");
  return { ok: "Textos del login guardados" };
}

/** Port de /accion/login-media-meta (título/texto/orden por slide). */
export async function loginMediaMetaAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const u = await requiereAdmin();
  const archivo = path.basename(String(fd.get("archivo") ?? ""));
  if (!archivo) return { error: "Archivo no encontrado" };
  const fila = await prisma.configuraciones.findUnique({ where: { clave: "login_media_meta" } });
  let meta: Record<string, unknown> = {};
  try { meta = JSON.parse(fila?.valor ?? "{}") || {}; } catch { /* json corrupto → se regenera */ }
  meta[archivo] = {
    titulo: String(fd.get("titulo") ?? "").trim().slice(0, 60),
    texto: String(fd.get("texto") ?? "").trim().slice(0, 120),
    orden: Math.max(1, Math.min(99, parseInt(String(fd.get("orden") ?? "1"), 10) || 1)),
  };
  await prisma.configuraciones.upsert({
    where: { clave: "login_media_meta" },
    create: { clave: "login_media_meta", valor: JSON.stringify(meta), tipo: "json", descripcion: "Título, texto y orden por imagen del carrusel del login." },
    update: { valor: JSON.stringify(meta), actualizado_por: u.id },
  });
  revalidatePath("/panel/personalizar-login"); revalidatePath("/panel/login");
  return { ok: "Slide actualizado" };
}

/** Port de /accion/login-media-subir: MP4 directo; imágenes a 1080×1350 JPG. */
export async function loginMediaSubirAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  await requiereAdmin();
  const archivo = fd.get("media");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elige un archivo válido" };
  if (archivo.size > 25 * 1024 * 1024) return { error: "El archivo no puede pesar más de 25 MB" };
  const ext = (archivo.name.split(".").pop() ?? "").toLowerCase();
  if (!["jpg", "jpeg", "png", "webp", "mp4"].includes(ext)) return { error: "Solo se aceptan JPG, PNG, WebP o MP4" };
  const dir = path.join(dirImgPanel(), "login");
  await mkdir(dir, { recursive: true });
  const ahora = ahoraPared();
  const base = `${ahora.toISOString().slice(0, 10).replace(/-/g, "")}-${ahora.toISOString().slice(11, 19).replace(/:/g, "")}-${randomBytes(4).toString("hex")}`;
  const buf = Buffer.from(await archivo.arrayBuffer());
  if (ext === "mp4") {
    if (buf.subarray(4, 8).toString("latin1") !== "ftyp") return { error: "Solo se aceptan JPG, PNG, WebP o MP4" };
    await writeFile(path.join(dir, `${base}.mp4`), buf);
  } else {
    try {
      await sharp(buf).resize(1080, 1350, { fit: "cover" }).jpeg({ quality: 88 }).toFile(path.join(dir, `${base}.jpg`));
    } catch { return { error: "No pudimos procesar esa imagen, intenta con otra" }; }
  }
  revalidatePath("/panel/personalizar-login"); revalidatePath("/panel/login");
  return { ok: "Archivo agregado al carrusel del login" };
}

/** Port de /accion/login-media-borrar. */
export async function loginMediaBorrarAccion(archivo: string): Promise<Resultado> {
  await requiereAdmin();
  const nombre = path.basename(archivo);
  if (!nombre) return { error: "Archivo no encontrado" };
  try { await unlink(path.join(dirImgPanel(), "login", nombre)); } catch { /* ya no existe */ }
  revalidatePath("/panel/personalizar-login"); revalidatePath("/panel/login");
  return { ok: "Archivo eliminado del carrusel" };
}

/** Port de /accion/agente-ia del panel (mismo prompt de sistema). */
export async function agentePanelAccion(mensaje: string, historial: Turno[]): Promise<{ respuesta?: string; error?: string }> {
  await requiereSesion();
  const texto = mensaje.trim();
  if (!texto || texto.length > 800) return { error: "Escribe un mensaje válido." };
  const sistema =
    "Eres Mathy, el asistente de IA del CRM interno de Cursos Inmath. Ayudas a asesores " +
    "y administradores a usar el panel: mover prospectos de etapa en el pipeline, agendar " +
    "y gestionar citas, revisar alumnos y pagos, y (solo administradores) editar el prompt " +
    "del bot y la configuración. Respondes en español, breve y directo (máximo 3-4 frases). " +
    "No inventes datos de prospectos, cifras ni información que no tengas.";
  try {
    return { respuesta: await responderGemini(sistema, historial.slice(-12), texto) };
  } catch {
    return { error: "No pude conectarme en este momento. Intenta de nuevo en unos segundos." };
  }
}
