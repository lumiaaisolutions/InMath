import { NextRequest, NextResponse } from "next/server";
import { procesadorPorNombre, aplicarEventoPago } from "@/lib/pagos-drivers";

/**
 * POST /api/webhooks/pago/{procesador} — lo llama el procesador externo,
 * SIN X-API-Key; la autenticidad la valida cada driver (firma HMAC).
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ procesador: string }> }) {
  const { procesador: nombre } = await ctx.params;
  let procesador;
  try { procesador = procesadorPorNombre(nombre); } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  const crudo = await req.text();
  const evento = await procesador.verificarWebhook(req.headers, crudo);
  if (evento === null) {
    return NextResponse.json({ error: "Webhook no auténtico o irrelevante" }, { status: 400 });
  }
  const resultado = await aplicarEventoPago(evento);
  return NextResponse.json({ recibido: true, detalle: resultado.mensaje }, { status: resultado.ok ? 200 : 404 });
}
