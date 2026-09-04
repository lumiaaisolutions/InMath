export type Turno = { rol: "usuario" | "asistente"; texto: string };

/** Port fiel de App\IA\GeminiClient::responder (thinkingLevel low incluido).
 *
 *  Resiliencia (04-sep-2026): el modelo configurado puede degradarse del
 *  lado de Google sin aviso (pasó con gemini-3.5-flash-lite: colgado >50s →
 *  Mathy contestaba "Sin conexión" a todos). Ahora se intenta el modelo
 *  configurado con un timeout corto y, si falla o se cuelga, se REINTENTA
 *  automáticamente con el modelo de respaldo antes de rendirse. */
const MODELO_RESPALDO = "gemini-3.6-flash";

async function llamarGemini(modelo: string, apiKey: string, sistema: string, contents: unknown[], timeoutMs: number): Promise<string> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sistema }] },
      contents,
      generationConfig: { temperature: 0.6, maxOutputTokens: 400, thinkingConfig: { thinkingLevel: "minimal" } },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();
  const texto = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  if (!texto) throw new Error("Gemini sin texto");
  return texto.trim();
}

export async function responderGemini(sistema: string, historial: Turno[], mensaje: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY no configurada");
  const modelo = process.env.GEMINI_MODEL ?? MODELO_RESPALDO;
  const contents = historial.map((t) => ({ role: t.rol === "asistente" ? "model" : "user", parts: [{ text: t.texto }] }));
  contents.push({ role: "user", parts: [{ text: mensaje }] });

  try {
    // Timeout corto en el primer intento: si el modelo está degradado, mejor
    // caer rápido al respaldo que dejar al visitante esperando medio minuto.
    return await llamarGemini(modelo, apiKey, sistema, contents, 12_000);
  } catch (e) {
    if (modelo === MODELO_RESPALDO) throw e;
    console.error(`[gemini] modelo ${modelo} falló (${e instanceof Error ? e.message : e}) — reintentando con ${MODELO_RESPALDO}`);
    return await llamarGemini(MODELO_RESPALDO, apiKey, sistema, contents, 30_000);
  }
}
