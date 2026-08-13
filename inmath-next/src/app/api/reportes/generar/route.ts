import { NextRequest, NextResponse } from "next/server";
import { generarSemana } from "@/lib/reportes/generador";
import { verificarApiKey, filaApi } from "@/lib/api";

/** POST /api/reportes/generar — n8n lo dispara semanalmente (flujo 08). */
export async function POST(req: NextRequest) {
  const noAuth = verificarApiKey(req);
  if (noAuth) return noAuth;
  const cuerpo = await req.json().catch(() => ({}));
  const generados = await generarSemana(cuerpo.semana ?? null);
  return NextResponse.json({ generados: generados.length, reportes: generados.map((r) => filaApi(r)) }, { status: 201 });
}
