import { NextRequest, NextResponse } from "next/server";
import { verificarApiKey } from "@/lib/api";
import { sistemaAgenteSitio } from "@/lib/agente-sitio";
import { calentarOllama } from "@/lib/ia";

/**
 * POST /api/ia/calentar — cron cada 15 min (scripts/calentar-mathy.sh).
 * Mantiene el modelo local de Ollama cargado Y el prompt REAL de Mathy en
 * la caché de prefijo: sin esto, la primera respuesta de cada visitante
 * tardaría ~30 s (medido); con esto, ~8-15 s.
 */
export async function POST(req: NextRequest) {
  const noAuth = verificarApiKey(req);
  if (noAuth) return noAuth;
  const { sistema } = await sistemaAgenteSitio();
  const r = await calentarOllama(sistema);
  return NextResponse.json(r);
}
