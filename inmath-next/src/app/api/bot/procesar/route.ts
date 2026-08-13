import { NextRequest, NextResponse } from "next/server";
import { procesarMensajeBot, type Extras } from "@/lib/bot";
import { normalizaTelefono } from "@/lib/prospectos";
import { verificarApiKey } from "@/lib/api";

/** POST /api/bot/procesar — n8n lo llama por cada mensaje entrante de WhatsApp. */
export async function POST(req: NextRequest) {
  const noAuth = verificarApiKey(req);
  if (noAuth) return noAuth;
  const cuerpo = await req.json().catch(() => ({}));
  if (!cuerpo.telefono_whatsapp || cuerpo.contenido === undefined) {
    return NextResponse.json({ error: "Faltan campos: telefono_whatsapp, contenido" }, { status: 422 });
  }
  const telefono = normalizaTelefono(String(cuerpo.telefono_whatsapp));
  if (!telefono) return NextResponse.json({ error: "telefono_whatsapp inválido" }, { status: 422 });

  const extras: Extras = {};
  for (const k of ["nombre", "fuente", "curso_interes_id", "wa_message_id", "tipo"] as const) {
    if (cuerpo[k] !== undefined) (extras as Record<string, unknown>)[k] = cuerpo[k];
  }
  return NextResponse.json(await procesarMensajeBot(telefono, String(cuerpo.contenido), extras));
}
