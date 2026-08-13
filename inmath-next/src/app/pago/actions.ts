"use server";
import { prisma } from "@/lib/db";
import { ahoraPared } from "@/lib/fechas";
import { upsertPorTelefono, normalizaTelefono } from "@/lib/prospectos";
import { pagoParaProspecto, tokenPago, tokenPagoValido, guardarComprobante } from "@/lib/pagos";

export type EstadoPago = {
  error?: string;
  pago?: { id: number; montoCentavos: number; moneda: string; link: string | null; token: string; nombre: string };
};
export type EstadoComprobante = { ok?: boolean; error?: string };

/** Port del POST inicial de pago.php: registra al prospecto y prepara su pago. */
export async function iniciarPago(_prev: EstadoPago, fd: FormData): Promise<EstadoPago> {
  if (String(fd.get("sitio_web") ?? "") !== "") return { error: "No pudimos procesar tu solicitud." };
  const nombre = String(fd.get("nombre") ?? "").trim();
  const telefono = normalizaTelefono(String(fd.get("telefono") ?? ""));
  if (!nombre || !telefono) return { error: "Escribe tu nombre y un teléfono de WhatsApp válido (10 dígitos)." };

  const curso = await prisma.cursos.findFirst({ where: { activo: true }, orderBy: { id: "asc" } });
  if (!curso) return { error: "No hay curso disponible por el momento." };

  const { prospecto } = await upsertPorTelefono(telefono, { nombre, fuente: "organico" });
  if (!prospecto.nombre && nombre) {
    await prisma.prospectos.update({ where: { id: prospecto.id }, data: { nombre } });
  }
  const pago = await pagoParaProspecto(prospecto.id, curso);
  return {
    pago: {
      id: pago.id, montoCentavos: pago.monto_centavos, moneda: pago.moneda,
      link: pago.link_pago, token: tokenPago(pago.id), nombre,
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
  return { ok: true };
}
