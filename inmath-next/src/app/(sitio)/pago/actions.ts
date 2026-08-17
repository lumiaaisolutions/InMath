"use server";
import { prisma } from "@/lib/db";
import { ahoraPared } from "@/lib/fechas";
import { upsertPorTelefono, normalizaTelefono } from "@/lib/prospectos";
import { pagoParaProspecto, tokenPago, tokenPagoValido, guardarComprobante } from "@/lib/pagos";
import { enviarCorreo } from "@/lib/correo";

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
    asunto: `Tu inscripción a ${curso.nombre}`,
    texto: [
      `Hola ${nombre},`,
      "",
      `Apartamos tu lugar en ${curso.nombre} — $${formateaMonto(pago.monto_centavos)} ${pago.moneda}.`,
      pago.link_pago ? `Paga en línea de forma segura: ${pago.link_pago}` : "",
      "También puedes pagar por transferencia y subir tu comprobante en la misma página de inscripción.",
      "",
      "Cuando confirmemos tu pago, tus datos de acceso te llegan por este correo.",
      "",
      "— Cursos InMath",
    ].filter(Boolean).join("\n"),
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
      asunto: "Recibimos tu comprobante — Cursos InMath",
      texto: [
        `Hola ${pago.prospectos.nombre ?? ""},`.replace(" ,", ","),
        "",
        "Recibimos tu comprobante de pago. Lo revisamos y, en cuanto se confirme, tus datos de acceso te llegan por este correo.",
        "",
        "— Cursos InMath",
      ].join("\n"),
    });
  }
  return { ok: true };
}
