import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "./db";
import { ahoraPared } from "./fechas";
import { enviarCorreo, CORREO_CONTACTO } from "./correo";
import { generarOLeerRecibo, reciboEmbebidoDesdePago } from "./recibo";

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
  const curso = await prisma.cursos.findUnique({ where: { id: pago.curso_id }, select: { nombre: true, precio_original_centavos: true } });
  // Se re-consulta el pago completo (el `pago` recibido puede venir de ANTES
  // de marcarlo "pagado") para que el recibo tenga pagado_en/procesador reales.
  const pagoCompleto = await prisma.pagos.findUnique({ where: { id: pago.id } });
  const alumnoNombre = prospecto.nombre ?? `Alumno ${prospecto.telefono_whatsapp}`;
  await enviarBienvenidaAlumno(prospecto, curso?.nombre ?? "tu curso", cred, pagoCompleto, alumnoNombre, curso?.precio_original_centavos ?? null);
  await avisarAdminPagoConfirmado(prospecto, curso?.nombre ?? "tu curso", pagoCompleto, alumnoNombre, curso?.precio_original_centavos ?? null);
  return { alumnoId, cred };
}

/**
 * Genera las credenciales del portal del alumno UNA sola vez (usuario = su
 * CORREO; el WhatsApp queda solo como dato de contacto). Si no dejó correo, se
 * usa el WhatsApp como respaldo. Devuelve la contraseña temporal en claro solo
 * la primera vez; `passTmp: null` si ya estaban provisionadas.
 */
/** Aviso al equipo: un alumno completó su pago. Incluye el recibo embebido
 *  (mismo formato del alumno) y el PDF adjunto, y un botón a la ficha. */
async function avisarAdminPagoConfirmado(
  prospecto: ProspectoAcceso, cursoNombre: string, pago: PagoParaRecibo, alumnoNombre?: string,
  precioOriginalCentavos?: number | null,
): Promise<void> {
  if (!pago) return;
  const nombre = alumnoNombre ?? prospecto.nombre ?? "Alumno";
  const base = (process.env.APP_URL ?? "").replace(/\/$/, "");
  let adjuntos: { filename: string; content: Buffer }[] | undefined;
  try {
    const recibo = await generarOLeerRecibo({
      id: pago.id, monto_centavos: pago.monto_centavos, moneda: pago.moneda,
      procesador: pago.procesador, pagado_en: pago.pagado_en, referencia_externa: pago.referencia_externa,
      alumnoNombre: nombre, cursoNombre,
    });
    adjuntos = [{ filename: `recibo-inmath-${String(pago.id).padStart(6, "0")}.pdf`, content: recibo }];
  } catch (e) { console.error("[recibo admin] no se pudo generar el PDF:", e); }

  await enviarCorreo({
    para: [CORREO_CONTACTO],
    asunto: `💰 Pago confirmado — ${nombre}`,
    tono: "verde",
    preheader: `${nombre} pagó ${cursoNombre}. Ya quedó inscrito y con acceso al portal.`,
    texto: `${nombre} (${prospecto.correo ?? prospecto.telefono_whatsapp}) completó su pago por ${cursoNombre}. Su cuenta ya quedó inscrita y con acceso al portal.\n\nAdjuntamos el recibo; abajo el mismo detalle.`,
    recibo: reciboEmbebidoDesdePago(
      { id: pago.id, monto_centavos: pago.monto_centavos, moneda: pago.moneda, procesador: pago.procesador, pagado_en: pago.pagado_en, referencia_externa: pago.referencia_externa },
      nombre, cursoNombre, precioOriginalCentavos,
    ),
    ...(base ? { cta: { url: `${base}/panel/alumnos`, label: "Ver en el panel", icono: "pago" as const } } : {}),
    ...(adjuntos ? { adjuntos } : {}),
  }).catch((e) => console.error("avisarAdminPagoConfirmado:", e));
}

const esConflicto = (e: unknown) => (e as { code?: string })?.code === "P2002";

export async function provisionarAccesoAlumno(
  alumnoId: number,
  prospecto: ProspectoAcceso,
): Promise<{ usuario: string; passTmp: string | null }> {
  const alumno = await prisma.alumnos.findUnique({ where: { id: alumnoId } });
  if (!alumno) throw new Error(`Alumno ${alumnoId} no existe`);

  // El correo permite el login con Google (enlace por correo con un pago real).
  // `email` es UNIQUE (evita que dos cuentas ambiguas compartan login): si otro
  // alumno ya lo usa (dato repetido/familiar), esta cuenta simplemente se queda
  // sin correo propio — sigue teniendo acceso completo por `usuario`/contraseña,
  // nunca se bloquea un pago real por esto.
  let email = alumno.email;
  if (!email && prospecto.correo) {
    try {
      await prisma.alumnos.update({ where: { id: alumnoId }, data: { email: prospecto.correo } });
      email = prospecto.correo;
    } catch (e) {
      if (!esConflicto(e)) throw e;
      console.error(`provisionarAccesoAlumno: correo "${prospecto.correo}" ya en uso por otra cuenta — alumno ${alumnoId} se queda sin correo propio`);
    }
  }
  if (alumno.usuario) return { usuario: alumno.usuario, passTmp: null };

  // Usuario = correo (dato principal de acceso); WhatsApp de respaldo — y si
  // por algún choque IMPROBABLE el correo también estuviera tomado como
  // `usuario` de otra cuenta, cae al WhatsApp, que es único por construcción
  // (1 prospecto = 1 teléfono = 1 alumno), así que SIEMPRE hay un usuario
  // disponible sin bloquear la inscripción de un pago real.
  const passTmp = randomBytes(8).toString("base64url").replace(/[-_]/g, "x").slice(0, 10);
  const passwordHash = await bcrypt.hash(passTmp, 12);
  const candidatos = [...new Set([email, prospecto.correo, prospecto.telefono_whatsapp].filter((v): v is string => !!v))];
  for (const candidato of candidatos) {
    try {
      await prisma.alumnos.update({ where: { id: alumnoId }, data: { usuario: candidato, password_hash: passwordHash } });
      return { usuario: candidato, passTmp };
    } catch (e) {
      if (!esConflicto(e)) throw e;
    }
  }
  throw new Error(`provisionarAccesoAlumno: no se pudo asignar un usuario único para el alumno ${alumnoId}`);
}

type PagoParaRecibo = {
  id: number; monto_centavos: number; moneda: string; procesador: string | null;
  pagado_en: Date | null; referencia_externa: string | null;
} | null;

/** Correo con las credenciales del portal (solo si el alumno dejó correo).
 *  Si se pasa el pago, adjunta el recibo/ticket en PDF. */
export async function enviarBienvenidaAlumno(
  prospecto: ProspectoAcceso,
  cursoNombre: string,
  cred: { usuario: string; passTmp: string | null },
  pago?: PagoParaRecibo,
  alumnoNombre?: string,
  precioOriginalCentavos?: number | null,
): Promise<void> {
  if (!prospecto.correo) return;
  const url = (process.env.APP_URL ?? "").replace(/\/$/, "") + "/portal/login";
  const destacado = cred.passTmp
    ? `Tus datos de acceso:\nUsuario: ${cred.usuario}\nContraseña temporal: ${cred.passTmp}`
    : `Entra con tu usuario (${cred.usuario}) y la contraseña que elegiste.`;
  const nota = cred.passTmp
    ? "Por tu seguridad, cambia tu contraseña temporal la primera vez que entres."
    : undefined;

  let adjuntos: { filename: string; content: Buffer }[] | undefined;
  if (pago) {
    try {
      const recibo = await generarOLeerRecibo({
        id: pago.id, monto_centavos: pago.monto_centavos, moneda: pago.moneda,
        procesador: pago.procesador, pagado_en: pago.pagado_en, referencia_externa: pago.referencia_externa,
        alumnoNombre: alumnoNombre ?? prospecto.nombre ?? "Alumno InMath", cursoNombre,
      });
      adjuntos = [{ filename: `recibo-inmath-${String(pago.id).padStart(6, "0")}.pdf`, content: recibo }];
    } catch (e) {
      console.error("[recibo] no se pudo generar el PDF del recibo:", e);
    }
  }

  const reciboEmbebido = pago
    ? reciboEmbebidoDesdePago(
        { id: pago.id, monto_centavos: pago.monto_centavos, moneda: pago.moneda, procesador: pago.procesador, pagado_en: pago.pagado_en, referencia_externa: pago.referencia_externa },
        alumnoNombre ?? prospecto.nombre ?? "Alumno InMath", cursoNombre, precioOriginalCentavos,
      )
    : undefined;

  await enviarCorreo({
    para: [prospecto.correo],
    asunto: "¡Tu inscripción está activa!",
    tono: "verde",
    preheader: `Confirmamos tu pago por ${cursoNombre}. Ya puedes entrar a tu portal.`,
    recibo: reciboEmbebido,
    texto: [
      `Hola ${prospecto.nombre ?? ""},`.replace(" ,", ","),
      "",
      `¡Excelente noticia! Confirmamos tu pago por ${cursoNombre} y tu inscripción ya está activa. 🎉`,
      "",
      "Desde tu portal de alumno tienes tu avance del curso, tus asesorías, el material y tus reportes semanales.",
      ...(adjuntos ? ["", "Adjuntamos tu recibo de pago en PDF — también puedes descargarlo desde tu portal, en Mi cuenta."] : []),
    ].join("\n"),
    destacado,
    cta: { url, label: "Entrar a mi portal", icono: "check" },
    nota,
    adjuntos,
  });
}
