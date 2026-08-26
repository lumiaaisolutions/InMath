/** Cliente para el Ollama local del VPS (mismo host donde corre la app) — usado por "Explicar con IA" en Reactivos. */
export async function preguntarOllama(sistema: string, mensaje: string): Promise<string> {
  const base = process.env.OLLAMA_URL ?? "http://localhost:11434";
  const modelo = process.env.OLLAMA_MODEL ?? "qwen2.5:7b";

  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelo,
      stream: false,
      keep_alive: "30m", // evita recargar el modelo desde disco (~20-30s) en cada uso seguido
      messages: [
        { role: "system", content: sistema },
        { role: "user", content: mensaje },
      ],
      options: { temperature: 0.4 },
    }),
    // El primer uso tras inactividad recarga el modelo desde disco (~20-30s medido en el VPS)
    // antes de generar nada — 45s se quedaba corto con cualquier variación real.
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = await res.json();
  const texto = String(data?.message?.content ?? "").trim();
  if (!texto) throw new Error("Ollama sin texto");
  return texto;
}
