"use server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ahoraPared } from "@/lib/fechas";
import { upsertPorTelefono, normalizaTelefono } from "@/lib/prospectos";
import { pagoParaProspecto, tokenPago, tokenPagoValido, guardarComprobante } from "@/lib/pagos";
import { enviarCorreo } from "@/lib/correo";
import { passwordSegura } from "@/lib/password";

export type EstadoRegistro = {
  error?: string;
  ok?: { pagoId: number; token: string; montoCentavos: number; moneda: string; link: string | null };
};

/**
 * Registro paso a paso (wizard): crea la CUENTA del alumno con su propia
 * contraseña (para que pueda entrar a su portal aunque aún no pague) + un pago
 * pendiente. Si paga después, entra al portal pero queda BLOQUEADO hasta pagar.
 */
export async function registrarAlumnoAccion(fd: FormData): Promise<EstadoRegistro> {
  const nombre = String(fd.get("nombre") ?? "").trim();
  const correo = String(fd.get("correo") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const digitos = String(fd.get("whatsapp") ?? "").replace(/\D+/g, "");
  const cursoId = parseInt(String(fd.get("curso_id") ?? "0"), 10);
  const esGoogle = String(fd.get("google") ?? "") === "1";

  if (nombre.length < 2) return { error: "Escribe tu nombre completo." };
  if (digitos.length !== 10) return { error: "Tu WhatsApp debe tener 10 dígitos." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return { error: "Escribe un correo válido." };
  // Las cuentas de Google no usan contraseña (entran con Google).
  if (!esGoogle && !passwordSegura(password)) {
    return { error: "Tu contraseña debe tener al menos 8 caracteres, con mayúscula, minúscula y número." };
  }

  const telefono = normalizaTelefono(digitos);
  if (!telefono) return { error: "Tu WhatsApp no es válido." };
  const curso = (cursoId ? await prisma.cursos.findFirst({ where: { id: cursoId, activo: true } }) : null)
    ?? await prisma.cursos.findFirst({ where: { activo: true }, orderBy: { id: "asc" } });
  if (!curso) return { error: "No hay curso disponible por ahora." };

  const { prospecto } = await upsertPorTelefono(telefono, { nombre, fuente: "organico" });
  await prisma.prospectos.update({ where: { id: prospecto.id }, data: { nombre, correo } });

  // Cuenta del alumno. Con Google no se guarda contraseña (entra con Google).
  const hash = esGoogle ? null : await bcrypt.hash(password, 10);
  const existente = await prisma.alumnos.findUnique({ where: { prospecto_id: prospecto.id } });
  if (existente) {
    await prisma.alumnos.update({ where: { id: existente.id }, data: { nombre, email: correo, usuario: correo, ...(hash ? { password_hash: hash } : {}), estado: "activo" } });
  } else {
    await prisma.alumnos.create({
      data: { prospecto_id: prospecto.id, curso_id: curso.id, nombre, telefono, email: correo, usuario: correo, password_hash: hash, estado: "activo", inscrito_en: ahoraPared() },
    });
  }

  const pago = await pagoParaProspecto(prospecto.id, curso);
  const sitio = (process.env.APP_URL ?? "https://inmath.lumiaaisolutions.com").replace(/\/$/, "");
  await enviarCorreo({
    para: [correo],
    asunto: `Tu cuenta para ${curso.nombre} está lista`,
    preheader: `Entra con tu correo (${correo}) y completa tu pago para desbloquear todo.`,
    texto: [
      `Hola ${nombre},`, "",
      `Creamos tu cuenta para ${curso.nombre}. Ya puedes entrar a tu portal de alumno.`,
    ].join("\n"),
    destacado: `Tus datos de acceso:\nUsuario: tu correo (${correo})\nContraseña: la que elegiste al registrarte`,
    pasos: [
      "Entra a tu portal con tu correo y contraseña.",
      "Completa tu pago desde el portal o en la página de inscripción.",
      "Al confirmarse, se desbloquea todo el contenido, tus asesorías y el material.",
    ],
    cta: { url: `${sitio}/portal/login`, label: "Entrar a mi portal" },
  });

  return { ok: { pagoId: pago.id, token: tokenPago(pago.id), montoCentavos: pago.monto_centavos, moneda: pago.moneda, link: pago.link_pago } };
}

export type EstadoPago = {
  error?: string;
  pago?: {
    id: number; montoCentavos: number; moneda: string; link: string | null;
    token: string; nombre: string; yaPague: boolean;
  };
};
export type EstadoComprobante = { ok?: boolean; error?: string };

const formateaMonto = (centavos: number) =>
  (centavos / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Port del POST inicial de pago.php: registra al prospecto y prepara su pago. */
export async function iniciarPago(_prev: EstadoPago, fd: FormData): Promise<EstadoPago> {
  if (String(fd.get("sitio_web") ?? "") !== "") return { error: "No pudimos procesar tu solicitud." };
  const nombre = String(fd.get("nombre") ?? "").trim();
  const correo = String(fd.get("correo") ?? "").trim().toLowerCase();
  const yaPague = String(fd.get("ya_pague") ?? "") === "1";

  // El campo pide 10 dígitos (celular MX): exactamente 10, sin lada país.
  const digitos = String(fd.get("telefono") ?? "").replace(/\D+/g, "");
  if (digitos.length !== 10) return { error: "Tu WhatsApp debe tener exactamente 10 dígitos." };
  const telefono = normalizaTelefono(digitos);
  if (!nombre || !telefono) return { error: "Escribe tu nombre y un teléfono de WhatsApp válido (10 dígitos)." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return { error: "Escribe un correo válido — ahí te damos el seguimiento de tu pago." };

  const curso = await prisma.cursos.findFirst({ where: { activo: true }, orderBy: { id: "asc" } });
  if (!curso) return { error: "No hay curso disponible por el momento." };

  const { prospecto } = await upsertPorTelefono(telefono, { nombre, fuente: "organico" });
  const datos: { nombre?: string; correo?: string } = {};
  if (!prospecto.nombre && nombre) datos.nombre = nombre;
  if (correo && prospecto.correo !== correo) datos.correo = correo;
  if (Object.keys(datos).length) {
    await prisma.prospectos.update({ where: { id: prospecto.id }, data: datos });
  }
  const pago = await pagoParaProspecto(prospecto.id, curso);

  // Seguimiento por correo (canal principal de esta área). Si el proveedor
  // aún no está configurado, enviarCorreo lo omite y lo deja en el log.
  await enviarCorreo({
    para: [correo],
    asunto: `Apartamos tu lugar en ${curso.nombre}`,
    preheader: `${curso.nombre} — $${formateaMonto(pago.monto_centavos)} ${pago.moneda}. Completa tu pago para asegurar tu lugar.`,
    texto: [
      `Hola ${nombre},`,
      "",
      `Apartamos tu lugar en ${curso.nombre}. Solo falta completar tu pago para asegurarlo.`,
    ].join("\n"),
    destacado: `${curso.nombre}\nTotal: $${formateaMonto(pago.monto_centavos)} ${pago.moneda}`,
    pasos: [
      pago.link_pago ? "Paga en línea de forma segura con el botón de abajo." : "Realiza tu pago por transferencia (datos en la página de inscripción).",
      "O paga por transferencia y sube tu comprobante en la misma página.",
      "Cuando confirmemos tu pago, tus datos de acceso te llegan por este correo.",
    ],
    ...(pago.link_pago ? { cta: { url: pago.link_pago, label: "Pagar de forma segura" } } : {}),
  });

  return {
    pago: {
      id: pago.id, montoCentavos: pago.monto_centavos, moneda: pago.moneda,
      link: pago.link_pago, token: tokenPago(pago.id), nombre, yaPague,
    },
  };
}

/** Port del POST accion=comprobante de pago.php (el token sustituye a la sesión). */
export async function subirComprobante(_prev: EstadoComprobante, fd: FormData): Promise<EstadoComprobante> {
  const pagoId = parseInt(String(fd.get("pago_id") ?? "0"), 10);
  const token = String(fd.get("token") ?? "");
  if (!pagoId || !tokenPagoValido(pagoId, token)) return { error: "La sesión expiró, vuelve a llenar tus datos." };

  const archivo = fd.get("comprobante");
  if (!(archivo instanceof File)) return { error: "Adjunta tu comprobante (imagen o PDF de hasta 8 MB)." };
  const r = await guardarComprobante(pagoId, archivo);
  if ("error" in r) return { error: r.error };

  await prisma.pagos.updateMany({
    where: { id: pagoId, estado: "pendiente" },
    data: { comprobante: r.nombre, comprobante_subido_en: ahoraPared() },
  });

  const pago = await prisma.pagos.findUnique({ where: { id: pagoId }, include: { prospectos: true } });
  if (pago?.prospectos?.correo) {
    await enviarCorreo({
      para: [pago.prospectos.correo],
      asunto: "Recibimos tu comprobante",
      tono: "verde",
      preheader: "Estamos revisando tu comprobante. Te avisamos en cuanto se confirme.",
      texto: [
        `Hola ${pago.prospectos.nombre ?? ""},`.replace(" ,", ","),
        "",
        "¡Gracias! Recibimos tu comprobante de pago y ya lo estamos revisando.",
      ].join("\n"),
      destacado: "En cuanto lo confirmemos (normalmente el mismo día), tu portal se desbloquea y tus datos de acceso te llegan por este correo.",
    });
  }
  return { ok: true };
}
