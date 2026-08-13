import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

/** Port de Core\Auth: autenticación máquina-a-máquina para n8n vía X-API-Key. */
export function verificarApiKey(req: NextRequest): NextResponse | null {
  const esperada = process.env.API_KEY ?? "";
  if (!esperada) return NextResponse.json({ error: "API_KEY no configurada en el servidor" }, { status: 500 });
  const recibida = req.headers.get("x-api-key") ?? "";
  const a = Buffer.from(esperada), b = Buffer.from(recibida);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return null;
}

/** DATETIME de la BD (hora de pared) → "YYYY-MM-DD HH:MM:SS" para el JSON de la API. */
export function fechaApi(d: Date | null): string | null {
  if (d === null) return null;
  return d.toISOString().slice(0, 19).replace("T", " ");
}

/** Serializa una fila de Prisma: Dates a hora de pared y BigInt a number. */
export function filaApi<T extends Record<string, unknown>>(fila: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fila)) {
    out[k] = v instanceof Date ? fechaApi(v) : typeof v === "bigint" ? Number(v) : v;
  }
  return out;
}
