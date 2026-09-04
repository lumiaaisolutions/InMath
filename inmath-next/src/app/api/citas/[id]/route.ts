import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { paredDesde } from "@/lib/fechas";
import { verificarApiKey, filaApi } from "@/lib/api";

const ESTADOS = ["agendada", "confirmada", "completada", "cancelada", "no_asistio"];

/** PATCH /api/citas/{id} — estado, meet_link, recordatorio_enviado_en (n8n). */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const noAuth = verificarApiKey(req);
  if (noAuth) return noAuth;
  const id = parseInt((await ctx.params).id, 10);
  const actual = await prisma.citas.findUnique({ where: { id }, select: { id: true, meet_link: true } });
  if (!actual) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }
  const cuerpo = await req.json().catch(() => ({}));

  // ANTI-DUPLICADOS 3 (lado del robot): si la cita YA tiene link (el
  // respaldo directo ganó la carrera mientras n8n tardaba), el link del
  // robot NO sobreescribe — y su evento recién creado se borra del
  // calendario para que no queden dos. "El primero gana" en ambos sentidos.
  if (cuerpo.meet_link && actual.meet_link && cuerpo.meet_link !== actual.meet_link) {
    if (cuerpo.google_event_id) {
      const { borrarEventoDirecto } = await import("@/lib/google-calendar");
      borrarEventoDirecto(String(cuerpo.google_event_id)).catch(() => {});
    }
    delete cuerpo.meet_link;
    delete cuerpo.google_event_id;
  }

  const data: Record<string, unknown> = {};
  if ("estado" in cuerpo) {
    if (!ESTADOS.includes(cuerpo.estado)) return NextResponse.json({ error: "estado inválido" }, { status: 422 });
    data.estado = cuerpo.estado;
  }
  for (const campo of ["google_event_id", "meet_link"]) {
    if (campo in cuerpo) data[campo] = cuerpo[campo];
  }
  if ("recordatorio_enviado_en" in cuerpo) {
    data.recordatorio_enviado_en = cuerpo.recordatorio_enviado_en === null
      ? null : paredDesde(String(cuerpo.recordatorio_enviado_en));
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nada que actualizar" }, { status: 422 });
  const cita = await prisma.citas.update({ where: { id }, data });
  return NextResponse.json(filaApi(cita));
}
