import { NextRequest, NextResponse } from "next/server";
import { prisma, config } from "@/lib/db";
import { ahoraPared } from "@/lib/fechas";
import { verificarApiKey, filaApi } from "@/lib/api";

/** GET /api/citas/por-recordar — citas próximas sin recordatorio (flujo 04 de n8n). */
export async function GET(req: NextRequest) {
  const noAuth = verificarApiKey(req);
  if (noAuth) return noAuth;
  const horas = parseInt(await config("recordatorio_cita_horas", "2"), 10);
  const ahora = ahoraPared();
  const hasta = new Date(ahora.getTime() + horas * 3600_000);
  const citas = await prisma.citas.findMany({
    where: {
      estado: { in: ["agendada", "confirmada"] },
      recordatorio_enviado_en: null,
      inicio: { gt: ahora, lte: hasta },
    },
    orderBy: { inicio: "asc" },
    include: { prospectos: { select: { telefono_whatsapp: true, nombre: true } }, usuarios: { select: { nombre: true } } },
  });
  return NextResponse.json(citas.map((c) => ({
    ...filaApi({ ...c, prospectos: undefined, usuarios: undefined }),
    telefono_whatsapp: c.prospectos.telefono_whatsapp,
    prospecto_nombre: c.prospectos.nombre,
    asesor_nombre: c.usuarios.nombre,
  })));
}
