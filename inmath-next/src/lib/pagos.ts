import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma, config } from "./db";
import { ahoraPared } from "./fechas";
import { procesadorActivo } from "./pagos-drivers";
import { contenidoCoincideConExtension } from "./magic-bytes";
import { VIGENCIA_HORAS } from "./pagos-vencimiento";

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

/**
 * Asegura que un pago pendiente tenga enlace de pago en línea SI hay un
 * procesador activo (ej. MercadoPago). Genera el enlace sobre el MISMO pago
 * (no crea duplicados) y lo guarda. Devuelve el enlace o null si no hay
 * procesador configurado (entonces solo aplica la transferencia).
 */
export async function asegurarLinkDePago(pagoId: number): Promise<string | null> {
  const pago = await prisma.pagos.findUnique({ where: { id: pagoId } });
  if (!pago || pago.estado !== "pendiente") return pago?.link_pago ?? null;
  if (pago.link_pago) return pago.link_pago;

  let procesador;
  try { procesador = await procesadorActivo(); } catch { return null; }

  const prospecto = await prisma.prospectos.findUnique({ where: { id: pago.prospecto_id } });
  const curso = await prisma.cursos.findFirst({ where: { id: pago.curso_id } });
  if (!prospecto || !curso) return null;

  try {
    const link = await procesador.crearLink(pago, prospecto, curso);
    const nombreProcesador = (await config("procesador_pago_activo", "")).trim() || null;
    await prisma.pagos.update({
      where: { id: pago.id },
      data: { procesador: nombreProcesador, link_pago: link.link, referencia_externa: link.referencia_externa, link_generado_en: ahoraPared() },
    });
    return link.link;
  } catch {
    return null; // Si el procesador falla, se mantiene la transferencia.
  }
}

/**
 * Reemplazo del $_SESSION['pagos_propios'] del PHP: token HMAC por pago.
 * Incluye expiración (misma vigencia de 72h del flujo de vencimiento en
 * pagos-vencimiento.ts, para no inventar otro plazo) en formato "exp.firma"
 * — igual que las cookies de sesión del panel — para que un token que quedó
 * abierto en una pestaña vieja no sirva para siempre.
 */
function secreto(): string {
  const s = process.env.APP_SECRET ?? "";
  if (!s) throw new Error("Falta APP_SECRET en .env");
  return s;
}
const VIGENCIA_TOKEN_PAGO_MS = VIGENCIA_HORAS * 3600_000;

function firmaTokenPago(pagoId: number, exp: number): string {
  return createHmac("sha256", secreto()).update(`pago:${pagoId}:${exp}`).digest("hex");
}
export function tokenPago(pagoId: number): string {
  const exp = Date.now() + VIGENCIA_TOKEN_PAGO_MS;
  return `${exp}.${firmaTokenPago(pagoId, exp)}`;
}
export function tokenPagoValido(pagoId: number, token: string): boolean {
  const [expStr, firma] = token.split(".");
  if (!expStr || !firma) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const esperado = Buffer.from(firmaTokenPago(pagoId, exp));
  const dado = Buffer.from(firma);
  return dado.length === esperado.length && timingSafeEqual(esperado, dado);
}

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
  if (!["jpg", "jpeg", "png", "webp", "pdf"].includes(ext) || !contenidoCoincideConExtension(ext, contenido)) {
    return { error: "Solo aceptamos JPG, PNG, WebP o PDF." };
  }
  const dir = process.env.COMPROBANTES_DIR ?? path.resolve(process.cwd(), "../backend/storage/comprobantes");
  await mkdir(dir, { recursive: true });
  const nombre = `${pagoId}-${randomBytes(5).toString("hex")}.${ext}`;
  await writeFile(path.join(dir, nombre), contenido);
  return { nombre };
}
