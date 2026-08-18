import { NextRequest, NextResponse } from "next/server";
import { verificarApiKey } from "@/lib/api";
import { procesarVencimientosPagos } from "@/lib/pagos-vencimiento";

/**
 * POST /api/pagos/vencimiento — pensado para un cron cada hora. Avisa por
 * correo a los 24h y 3h antes del límite de 72h, y cancela el pago pendiente
 * al cumplirse las 72h sin confirmar.
 */
export async function POST(req: NextRequest) {
  const noAuth = verificarApiKey(req);
  if (noAuth) return noAuth;
  const resultado = await procesarVencimientosPagos();
  return NextResponse.json(resultado);
}
