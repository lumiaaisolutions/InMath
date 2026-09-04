import { responderGemini, type Turno } from "./gemini";

/**
 * Motor de IA de Mathy — OLLAMA LOCAL como titular (decisión del cliente:
 * sin depender de Gemini), con Gemini SOLO de paracaídas si Ollama falla.
 *
 * Rendimiento en el VPS (medido 04-sep-2026, qwen2.5:3b en CPU):
 * - Prompt frío: ~25 s solo en leer el prompt del sistema. INVIABLE en vivo.
 * - Prompt PRECALENTADO (caché de prefijo de Ollama): 0.4 s + generación
 *   (~13 tokens/s → respuestas de 8-15 s).
 * Por eso existe /api/ia/calentar + scripts/calentar-mathy.sh (cron cada 15
 * min): mantienen el modelo cargado Y el prompt real de Mathy en caché.
 */
const OLLAMA_URL = () => (process.env.OLLAMA_URL ?? "http://127.0.0.1:11434").replace(/\/$/, "");
const OLLAMA_MODEL = () => process.env.OLLAMA_MODEL ?? "qwen2.5:3b";

function mensajesOllama(sistema: string, historial: Turno[], mensaje: string) {
  return [
    { role: "system", content: sistema },
    ...historial.map((t) => ({ role: t.rol === "asistente" ? "assistant" : "user", content: t.texto })),
    { role: "user", content: mensaje },
  ];
}

async function responderOllama(sistema: string, historial: Turno[], mensaje: string): Promise<string> {
  const res = await fetch(`${OLLAMA_URL()}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL(),
      stream: false,
      messages: mensajesOllama(sistema, historial, mensaje),
      options: { temperature: 0.6, num_predict: 400 },
      keep_alive: "30m",
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = await res.json();
  const texto: string = data?.message?.content ?? "";
  if (!texto.trim()) throw new Error("Ollama sin texto");
  return texto.trim();
}

/** Punto de entrada único del chat (sitio y panel): Ollama local primero;
 *  si falla o se cae, Gemini responde para no dejar mudo a Mathy. */
export async function responderIA(sistema: string, historial: Turno[], mensaje: string): Promise<string> {
  try {
    return await responderOllama(sistema, historial, mensaje);
  } catch (e) {
    console.error(`[ia] Ollama falló (${e instanceof Error ? e.message : e})${process.env.GEMINI_API_KEY ? " — respaldo Gemini" : ""}`);
    if (!process.env.GEMINI_API_KEY) throw e;
    return await responderGemini(sistema, historial, mensaje);
  }
}

/** Precalienta el modelo Y la caché del prompt de Mathy (1 token de salida).
 *  Lo llama el cron cada 15 min vía /api/ia/calentar. */
export async function calentarOllama(sistema: string): Promise<{ ok: boolean; ms: number }> {
  const t0 = Date.now();
  try {
    const res = await fetch(`${OLLAMA_URL()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL(),
        stream: false,
        messages: [...mensajesOllama(sistema, [], "hola")],
        options: { num_predict: 1 },
        keep_alive: "30m",
      }),
      signal: AbortSignal.timeout(180_000),
    });
    return { ok: res.ok, ms: Date.now() - t0 };
  } catch {
    return { ok: false, ms: Date.now() - t0 };
  }
}
