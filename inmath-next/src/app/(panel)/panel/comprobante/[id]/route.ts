import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { usuarioActual, moduloPermitido } from "@/lib/panel/sesion";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".pdf": "application/pdf",
};

/** Port de la ruta /comprobante/{id} del panel PHP (requiere módulo pagos). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const u = await usuarioActual();
  if (!u || !moduloPermitido(u, "pagos")) return new Response("Sin acceso", { status: 403 });
  const id = parseInt((await ctx.params).id, 10);
  const pago = await prisma.pagos.findUnique({ where: { id }, select: { comprobante: true } });
  if (!pago?.comprobante) return new Response("Comprobante no encontrado", { status: 404 });
  const nombre = path.basename(pago.comprobante);
  const dir = process.env.COMPROBANTES_DIR ?? path.resolve(process.cwd(), "../backend/storage/comprobantes");
  const ext = path.extname(nombre).toLowerCase();
  try {
    const contenido = await readFile(path.join(dir, nombre));
    return new Response(new Uint8Array(contenido), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${nombre}"`,
      },
    });
  } catch {
    return new Response("Comprobante no encontrado", { status: 404 });
  }
}
