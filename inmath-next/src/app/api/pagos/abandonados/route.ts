import { NextRequest, NextResponse } from "next/server";
import { prisma, config } from "@/lib/db";
import { ahoraPared } from "@/lib/fechas";
import { verificarApiKey, filaApi } from "@/lib/api";

/** GET /api/pagos/abandonados — recuperación de carrito (n8n, flujo 06). */
export async function GET(req: NextRequest) {
  const noAuth = verificarApiKey(req);
  if (noAuth) return noAuth;
  const horasParam = req.nextUrl.searchParams.get("horas");
  const horas = horasParam
    ? Math.max(1, parseInt(horasParam, 10) || 1)
    : parseInt(await config("recuperacion_carrito_horas", "24"), 10);
  const ahora = ahoraPared();
  const umbral = new Date(ahora.getTime() - horas * 3600_000);
  const pagos = await prisma.pagos.findMany({
    where: {
      estado: "pendiente",
      link_generado_en: { not: null, lte: umbral },
      recordatorio_enviado_en: null,
      OR: [{ expira_en: null }, { expira_en: { gt: ahora } }],
    },
    orderBy: { link_generado_en: "asc" },
    include: { prospectos: { select: { telefono_whatsapp: true, nombre: true } } },
  });
  return NextResponse.json(pagos.map((pg) => ({
    ...filaApi({ ...pg, prospectos: undefined }),
    telefono_whatsapp: pg.prospectos.telefono_whatsapp,
    prospecto_nombre: pg.prospectos.nombre,
  })));
}
