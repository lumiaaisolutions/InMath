import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { dirStorage } from "@/lib/reportes/generador";
import { verificarApiKey } from "@/lib/api";

/** GET /api/reportes/{id}/archivo — descarga el PDF (n8n lo envía por WhatsApp). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const noAuth = verificarApiKey(req);
  if (noAuth) return noAuth;
  const id = parseInt((await ctx.params).id, 10);
  const reporte = await prisma.reportes_generados.findUnique({ where: { id } });
  if (!reporte) return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 });
  const ruta = path.join(dirStorage(), reporte.archivo);
  try {
    const contenido = await readFile(ruta);
    return new Response(new Uint8Array(contenido), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${path.basename(ruta)}"`,
        "Content-Length": String(contenido.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "Archivo no disponible en el servidor" }, { status: 410 });
  }
}
