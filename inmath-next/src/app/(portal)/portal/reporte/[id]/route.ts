import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { dirStorage } from "@/lib/reportes/generador";
import { alumnoActual } from "@/lib/portal/sesion";

/** GET /portal/reporte/{id} — descarga el PDF SOLO si es del alumno logueado. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const alumno = await alumnoActual();
  if (!alumno) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const id = parseInt((await ctx.params).id, 10);
  const reporte = await prisma.reportes_generados.findUnique({ where: { id } });
  if (!reporte || reporte.alumno_id !== alumno.id) {
    return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 });
  }

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
    return NextResponse.json({ error: "Archivo no disponible" }, { status: 410 });
  }
}
