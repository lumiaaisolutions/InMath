import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verificarApiKey } from "@/lib/api";

/** GET /api/asesores — asesores activos con su carga de prospectos vivos (n8n). */
export async function GET(req: NextRequest) {
  const noAuth = verificarApiKey(req);
  if (noAuth) return noAuth;
  const filas = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT u.id, u.nombre, u.email, u.telefono, u.google_calendar_id,
           COUNT(p.id) AS prospectos_activos
    FROM usuarios u
    LEFT JOIN prospectos p ON p.asesor_id = u.id AND p.etapa NOT IN ('inscrito', 'descartado')
    WHERE u.es_asesor = 1 AND u.activo = 1
    GROUP BY u.id
    ORDER BY u.id`;
  return NextResponse.json(filas.map((f) => ({ ...f, id: Number(f.id), prospectos_activos: Number(f.prospectos_activos) })));
}
