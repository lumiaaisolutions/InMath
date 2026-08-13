import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { paredDesde } from "@/lib/fechas";
import { verificarApiKey, filaApi } from "@/lib/api";

/** PATCH /api/reportes/{id} — marca el envío (n8n). */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const noAuth = verificarApiKey(req);
  if (noAuth) return noAuth;
  const id = parseInt((await ctx.params).id, 10);
  if (!(await prisma.reportes_generados.findUnique({ where: { id }, select: { id: true } }))) {
    return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 });
  }
  const cuerpo = await req.json().catch(() => ({}));
  if (!cuerpo.enviado_en) return NextResponse.json({ error: "Falta enviado_en" }, { status: 422 });
  const reporte = await prisma.reportes_generados.update({
    where: { id },
    data: { enviado_en: paredDesde(String(cuerpo.enviado_en)) },
  });
  return NextResponse.json(filaApi(reporte));
}
