import { NextRequest, NextResponse } from "next/server";
import { verificarApiKey } from "@/lib/api";
import { procesarRecordatoriosCitas } from "@/lib/citas-recordatorios";

/**
 * POST /api/citas/recordatorios — pensado para un cron cada 5 minutos (la
 * ventana de "10 minutos antes" no perdona un cron más espaciado). Manda
 * correo al prospecto y al asesor a 1 día, 3 horas, 1 hora y 10 minutos
 * antes de cada asesoría, sin repetir avisos ya enviados.
 */
export async function POST(req: NextRequest) {
  const noAuth = verificarApiKey(req);
  if (noAuth) return noAuth;
  const resultado = await procesarRecordatoriosCitas();
  return NextResponse.json(resultado);
}
