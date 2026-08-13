import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ahoraPared, paredDesde } from "@/lib/fechas";
import { inscribirPorPago } from "@/lib/inscripcion";
import { verificarApiKey, filaApi } from "@/lib/api";

const ESTADOS = ["pendiente", "pagado", "fallido", "reembolsado", "cancelado"];

/** PATCH /api/pagos/{id} — port del update del PHP (confirmar inscribe al alumno). */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const noAuth = verificarApiKey(req);
  if (noAuth) return noAuth;
  const id = parseInt((await ctx.params).id, 10);
  const pago = await prisma.pagos.findUnique({ where: { id } });
  if (!pago) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });

  const cuerpo = await req.json().catch(() => ({}));
  if ("estado" in cuerpo && !ESTADOS.includes(cuerpo.estado)) {
    return NextResponse.json({ error: "estado inválido" }, { status: 422 });
  }
  const data: Record<string, unknown> = {};
  for (const campo of ["estado", "procesador", "link_pago", "referencia_externa"]) {
    if (campo in cuerpo) data[campo] = cuerpo[campo];
  }
  for (const campo of ["recordatorio_enviado_en", "expira_en"]) {
    if (campo in cuerpo) data[campo] = cuerpo[campo] === null ? null : paredDesde(String(cuerpo[campo]));
  }
  if ("metadatos" in cuerpo) data.metadatos = cuerpo.metadatos;
  if (cuerpo.link_pago && pago.link_generado_en === null) data.link_generado_en = ahoraPared();

  const seConfirma = cuerpo.estado === "pagado" && pago.estado !== "pagado";
  if (seConfirma) {
    data.pagado_en = cuerpo.pagado_en ? paredDesde(String(cuerpo.pagado_en)) : ahoraPared();
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nada que actualizar" }, { status: 422 });

  await prisma.pagos.update({ where: { id }, data });
  if (seConfirma) await inscribirPorPago(pago);
  return NextResponse.json(filaApi((await prisma.pagos.findUnique({ where: { id } }))!));
}
