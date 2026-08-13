import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma, config } from "./db";
import { ahoraPared } from "./fechas";
import { procesadorActivo } from "./pagos-drivers";

/**
 * Flujo de /pago del sitio (port de pago.php): intenta el link con el
 * procesador activo (o reutiliza uno pendiente vigente); sin procesador
 * configurado cae a registrar el pago como transferencia, para que el
 * alumno suba su comprobante.
 */
export async function pagoParaProspecto(prospectoId: number, curso: { id: number; nombre: string; precio_centavos: number; moneda: string }) {
  const prospecto = await prisma.prospectos.findUnique({ where: { id: prospectoId } });
  const r = await linkParaProspecto(prospecto!, curso.id);
  if (r.ok) return r.pago;

  return prisma.pagos.create({
    data: {
      prospecto_id: prospectoId, curso_id: curso.id, procesador: "transferencia",
      monto_centavos: curso.precio_centavos, moneda: curso.moneda,
      estado: "pendiente", link_generado_en: ahoraPared(),
    },
  });
}

type ProspectoLink = { id: number; nombre: string | null; curso_interes_id: number | null };

/**
 * Port de PagoServicio::linkParaProspecto + crearConLink: reutiliza un pago
 * pendiente con link vigente o crea uno nuevo con el procesador activo.
 * Devuelve ok=false si no hay curso o no hay procesador configurado.
 */
export async function linkParaProspecto(prospecto: ProspectoLink, cursoId: number | null = null) {
  const curso = cursoId !== null
    ? await prisma.cursos.findFirst({ where: { id: cursoId, activo: true } })
    : prospecto.curso_interes_id !== null
      ? await prisma.cursos.findFirst({ where: { id: prospecto.curso_interes_id, activo: true } })
      : await prisma.cursos.findFirst({ where: { activo: true }, orderBy: { id: "asc" } });
  if (!curso) return { ok: false as const, mensaje: "No hay curso activo para cobrar" };

  const existente = await prisma.pagos.findFirst({
    where: {
      prospecto_id: prospecto.id, curso_id: curso.id, estado: "pendiente", link_pago: { not: null },
      OR: [{ expira_en: null }, { expira_en: { gt: ahoraPared() } }],
    },
    orderBy: { id: "desc" },
  });
  if (existente) return { ok: true as const, pago: existente };

  let procesador;
  try { procesador = await procesadorActivo(); } catch (e) {
    return { ok: false as const, mensaje: (e as Error).message };
  }
  const pago = await prisma.pagos.create({
    data: { prospecto_id: prospecto.id, curso_id: curso.id, monto_centavos: curso.precio_centavos, moneda: curso.moneda },
  });
  let link;
  try {
    link = await procesador.crearLink(pago, prospecto, curso);
  } catch (e) {
    await prisma.pagos.update({
      where: { id: pago.id },
      data: { estado: "fallido", metadatos: { error_link: (e as Error).message } as never },
    });
    return { ok: false as const, mensaje: (e as Error).message };
  }
  const nombreProcesador = (await config("procesador_pago_activo", "")).trim() || null;
  const actualizado = await prisma.pagos.update({
    where: { id: pago.id },
    data: { procesador: nombreProcesador, link_pago: link.link, referencia_externa: link.referencia_externa, link_generado_en: ahoraPared() },
  });
  const p = await prisma.prospectos.findUnique({ where: { id: prospecto.id }, select: { etapa: true } });
  if (p && p.etapa !== "pago_pendiente") {
    await prisma.prospectos.update({ where: { id: prospecto.id }, data: { etapa: "pago_pendiente" } });
    await prisma.bitacora_pipeline.create({
      data: { prospecto_id: prospecto.id, etapa_anterior: p.etapa, etapa_nueva: "pago_pendiente", origen: "sistema", nota: `Link de pago #${pago.id} generado` },
    });
  }
  return { ok: true as const, pago: actualizado };
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
