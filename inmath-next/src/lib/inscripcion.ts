import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "./db";
import { ahoraPared } from "./fechas";
import { enviarCorreo } from "./correo";

type PagoBase = { id: number; prospecto_id: number; curso_id: number; monto_centavos?: number; moneda?: string };
type ProspectoAcceso = { id: number; nombre: string | null; telefono_whatsapp: string; correo: string | null };

/**
 * Port de InscripcionServicio::porPago: inscribe al alumno desde un pago
 * confirmado y mueve el prospecto a 'inscrito'. Idempotente por
 * UNIQUE(prospecto_id) en alumnos (absorbe webhooks duplicados). Al final
 * provisiona el acceso al portal del alumno y le manda sus credenciales por
 * correo — el pago es el validador del login, así que el webhook (tarjeta) y
 * la aprobación manual del panel dan EXACTAMENTE el mismo acceso.
 */
export async function inscribirPorPago(
  pago: PagoBase,
): Promise<{ alumnoId: number; cred: { usuario: string; passTmp: string | null } }> {
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
  await prisma.pagos.update({ where: { id: pago.id }, data: { alumno_id: alumnoId } });
  if (prospecto.etapa !== "inscrito") {
    await prisma.prospectos.update({ where: { id: prospecto.id }, data: { etapa: "inscrito" } });
    await prisma.bitacora_pipeline.create({
      data: { prospecto_id: prospecto.id, etapa_anterior: prospecto.etapa, etapa_nueva: "inscrito", origen: "sistema", nota: `Pago #${pago.id} confirmado` },
    });
  }

  // Acceso al portal + correo de bienvenida (sin admin de por medio en el
  // webhook de tarjeta, así que las credenciales van por correo).
  const cred = await provisionarAccesoAlumno(alumnoId, prospecto);
  const curso = await prisma.cursos.findUnique({ where: { id: pago.curso_id }, select: { nombre: true } });
  await enviarBienvenidaAlumno(prospecto, curso?.nombre ?? "tu curso", cred);
  return { alumnoId, cred };
}

/**
 * Genera las credenciales del portal del alumno UNA sola vez (usuario = su
 * WhatsApp) y rellena su correo desde el prospecto. Devuelve la contraseña
 * temporal en claro solo la primera vez (para mostrarla al admin o enviarla
 * por correo); `passTmp: null` si ya estaban provisionadas.
 */
export async function provisionarAccesoAlumno(
  alumnoId: number,
  prospecto: ProspectoAcceso,
): Promise<{ usuario: string; passTmp: string | null }> {
  const alumno = await prisma.alumnos.findUnique({ where: { id: alumnoId } });
  if (!alumno) throw new Error(`Alumno ${alumnoId} no existe`);

  // El correo permite el login con Google (enlace por correo con un pago real).
  if (!alumno.email && prospecto.correo) {
    await prisma.alumnos.update({ where: { id: alumnoId }, data: { email: prospecto.correo } });
  }
  if (alumno.usuario) return { usuario: alumno.usuario, passTmp: null };

  const passTmp = randomBytes(8).toString("base64url").replace(/[-_]/g, "x").slice(0, 10);
  await prisma.alumnos.update({
    where: { id: alumnoId },
    data: { usuario: prospecto.telefono_whatsapp, password_hash: await bcrypt.hash(passTmp, 10) },
  });
  return { usuario: prospecto.telefono_whatsapp, passTmp };
}

/** Correo con las credenciales del portal (solo si el alumno dejó correo). */
export async function enviarBienvenidaAlumno(
  prospecto: ProspectoAcceso,
  cursoNombre: string,
  cred: { usuario: string; passTmp: string | null },
): Promise<void> {
  if (!prospecto.correo) return;
  const url = (process.env.APP_URL ?? "").replace(/\/$/, "") + "/portal/login";
  const destacado = cred.passTmp
    ? `Tus datos de acceso:\nUsuario: ${cred.usuario}\nContraseña temporal: ${cred.passTmp}`
    : `Entra con tu usuario (${cred.usuario}) y la contraseña que elegiste.`;
  const nota = cred.passTmp
    ? "Por tu seguridad, cambia tu contraseña temporal la primera vez que entres."
    : undefined;
  await enviarCorreo({
    para: [prospecto.correo],
    asunto: "¡Tu inscripción está activa!",
    tono: "verde",
    preheader: `Confirmamos tu pago por ${cursoNombre}. Ya puedes entrar a tu portal.`,
    texto: [
      `Hola ${prospecto.nombre ?? ""},`.replace(" ,", ","),
      "",
      `¡Excelente noticia! Confirmamos tu pago por ${cursoNombre} y tu inscripción ya está activa. 🎉`,
      "",
      "Desde tu portal de alumno tienes tu avance del curso, tus asesorías, el material y tus reportes semanales.",
    ].join("\n"),
    destacado,
    cta: { url, label: "Entrar a mi portal" },
    nota,
  });
}
