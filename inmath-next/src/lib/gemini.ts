export type Turno = { rol: "usuario" | "asistente"; texto: string };

/** Port fiel de App\IA\GeminiClient::responder (thinkingLevel low incluido). */
export async function responderGemini(sistema: string, historial: Turno[], mensaje: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY no configurada");
  const modelo = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
  const contents = historial.map((t) => ({ role: t.rol === "asistente" ? "model" : "user", parts: [{ text: t.texto }] }));
  contents.push({ role: "user", parts: [{ text: mensaje }] });

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sistema }] },
      contents,
      generationConfig: { temperature: 0.6, maxOutputTokens: 400, thinkingConfig: { thinkingLevel: "minimal" } },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();
  const texto = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  if (!texto) throw new Error("Gemini sin texto");
  return texto.trim();
}
