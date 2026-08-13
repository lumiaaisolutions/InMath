import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "./db";
import { ahoraPared } from "./fechas";

/**
 * Port de PagoServicio::linkParaProspecto para el sitio: reutiliza un pago
 * pendiente con link vigente si existe; si no, registra el pago como
 * transferencia (los drivers de procesador en línea se portan en F3 — hoy
 * `procesador_pago_activo` está vacío y el PHP cae a esta misma rama).
 */
export async function pagoParaProspecto(prospectoId: number, curso: { id: number; precio_centavos: number; moneda: string }) {
  const existente = await prisma.pagos.findFirst({
    where: {
      prospecto_id: prospectoId, curso_id: curso.id, estado: "pendiente", link_pago: { not: null },
      OR: [{ expira_en: null }, { expira_en: { gt: ahoraPared() } }],
    },
    orderBy: { id: "desc" },
  });
  if (existente) return existente;

  return prisma.pagos.create({
    data: {
      prospecto_id: prospectoId, curso_id: curso.id, procesador: "transferencia",
      monto_centavos: curso.precio_centavos, moneda: curso.moneda,
      estado: "pendiente", link_generado_en: ahoraPared(),
    },
  });
}

/** Reemplazo del $_SESSION['pagos_propios'] del PHP: token HMAC por pago. */
function secreto(): string {
  const s = process.env.APP_SECRET ?? "";
  if (!s) throw new Error("Falta APP_SECRET en .env");
  return s;
}
export function tokenPago(pagoId: number): string {
  return createHmac("sha256", secreto()).update(`pago:${pagoId}`).digest("hex");
}
export function tokenPagoValido(pagoId: number, token: string): boolean {
  const esperado = Buffer.from(tokenPago(pagoId));
  const dado = Buffer.from(token);
  return dado.length === esperado.length && timingSafeEqual(esperado, dado);
}

const TIPOS_OK: Record<string, (b: Buffer) => boolean> = {
  jpg: (b) => b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
  jpeg: (b) => b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
  png: (b) => b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])),
  webp: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  pdf: (b) => b.subarray(0, 4).toString("latin1") === "%PDF",
};

/**
 * Guarda el comprobante en el MISMO directorio que usa el panel PHP
 * (backend/storage/comprobantes) para que siga viéndolo durante el strangler.
 * Devuelve el nombre de archivo o un mensaje de error para el usuario.
 */
export async function guardarComprobante(pagoId: number, archivo: File): Promise<{ nombre: string } | { error: string }> {
  if (archivo.size === 0 || archivo.size > 8 * 1024 * 1024) {
    return { error: "Adjunta tu comprobante (imagen o PDF de hasta 8 MB)." };
  }
  const ext = (archivo.name.split(".").pop() ?? "").toLowerCase();
  const contenido = Buffer.from(await archivo.arrayBuffer());
  if (!TIPOS_OK[ext] || !TIPOS_OK[ext](contenido)) {
    return { error: "Solo aceptamos JPG, PNG, WebP o PDF." };
  }
  const dir = process.env.COMPROBANTES_DIR ?? path.resolve(process.cwd(), "../backend/storage/comprobantes");
  await mkdir(dir, { recursive: true });
  const nombre = `${pagoId}-${randomBytes(5).toString("hex")}.${ext}`;
  await writeFile(path.join(dir, nombre), contenido);
  return { nombre };
}
