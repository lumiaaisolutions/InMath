import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { alumnoActual } from "@/lib/portal/sesion";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".pdf": "application/pdf",
};

/** GET /portal/comprobante/{pagoId} — el comprobante que el alumno subió,
 *  SOLO si el pago es suyo. Mismo archivo que ve el admin, misma carpeta. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const alumno = await alumnoActual();
  if (!alumno) return new Response("No autorizado", { status: 401 });
  const id = parseInt((await ctx.params).id, 10);
  const pago = await prisma.pagos.findUnique({ where: { id }, select: { comprobante: true, prospecto_id: true } });
  if (!pago?.comprobante || pago.prospecto_id !== alumno.prospecto_id) {
    return new Response("Comprobante no encontrado", { status: 404 });
  }
  const nombre = path.basename(pago.comprobante);
  const dir = process.env.COMPROBANTES_DIR ?? path.resolve(process.cwd(), "../backend/storage/comprobantes");
  const ext = path.extname(nombre).toLowerCase();
  try {
    const contenido = await readFile(path.join(dir, nombre));
    return new Response(new Uint8Array(contenido), {
      headers: { "Content-Type": MIME[ext] ?? "application/octet-stream", "Content-Disposition": `inline; filename="${nombre}"` },
    });
  } catch {
    return new Response("Comprobante no encontrado", { status: 404 });
  }
}
