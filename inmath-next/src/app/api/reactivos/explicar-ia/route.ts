import { usuarioActual, moduloPermitido } from "@/lib/panel/sesion";

/** "Explicar con IA" — transmite la respuesta de Ollama token por token en
 *  vez de esperar a que termine, para que el admin vea texto de inmediato
 *  en lugar de un botón "Pensando…" congelado. */
export async function POST(req: Request) {
  // OJO: aquí NO sirve requiereModulo() — usa redirect(), que en un Route
  // Handler se vuelve un 307 que fetch SIGUE hasta una página HTML con
  // status 200... y el cliente streameaba ese HTML directo al textarea de
  // la explicación (el "muestra html en código" que reportó el cliente al
  // expirar su sesión). En un endpoint de fetch los errores se responden
  // como texto con status, nunca con redirect.
  const u = await usuarioActual();
  if (!u || !moduloPermitido(u, "reactivos")) {
    return new Response("Tu sesión expiró — recarga la página y vuelve a entrar.", { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const enunciado = String(body?.enunciado ?? "").trim();
  const opciones: string[] = Array.isArray(body?.opciones) ? body.opciones.map((o: unknown) => String(o ?? "")) : [];
  const correcta = Number(body?.correcta);

  if (!enunciado) return new Response("Escribe el enunciado antes de pedir ayuda a la IA", { status: 400 });
  if (opciones.length < 2 || !Number.isInteger(correcta) || correcta < 0 || correcta >= opciones.length) {
    return new Response("Completa las opciones y marca la correcta antes de pedir ayuda a la IA", { status: 400 });
  }

  const listado = opciones.map((o, i) => `${i === correcta ? "✔" : "•"} ${o}`).join("\n");
  const sistema =
    "Eres un profesor de InMath que prepara alumnos para el examen EXANI-II. Te dan una pregunta de opción " +
    "múltiple con la respuesta correcta marcada. Escribe una explicación bien fundamentada (4 a 6 líneas) de " +
    "por qué esa opción es correcta: da la razón principal y agrega un ejemplo concreto que la ilustre. " +
    "Español claro, directo al alumno. No repitas el enunciado ni la lista completa de opciones, no uses markdown.";
  const mensaje = `Pregunta: ${enunciado}\n\nOpciones:\n${listado}`;

  const base = (process.env.OLLAMA_URL ?? "http://localhost:11434").replace(/\/$/, "");
  const modelo = process.env.OLLAMA_MODEL ?? "qwen2.5:3b";

  let upstream: Response;
  try {
    upstream = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelo,
        stream: true,
        keep_alive: "30m", // evita recargar el modelo desde disco en cada uso seguido
        messages: [
          { role: "system", content: sistema },
          { role: "user", content: mensaje },
        ],
        options: { temperature: 0.4 },
      }),
      // El primer uso tras inactividad recarga el modelo desde disco antes de
      // generar nada — con streaming el admin ve texto en cuanto arranca, pero
      // seguimos dando margen amplio por si el modelo estaba frío.
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    return new Response("No pudimos contactar a la IA. Intenta de nuevo en unos segundos.", { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return new Response("No pudimos contactar a la IA. Intenta de nuevo en unos segundos.", { status: 502 });
  }

  // Ollama responde NDJSON (un objeto {message:{content}} por línea) — lo
  // convertimos a texto plano para que el cliente solo tenga que ir pegando
  // lo que llega.
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const upstreamBody = upstream.body;
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstreamBody.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let salto;
          while ((salto = buffer.indexOf("\n")) >= 0) {
            const linea = buffer.slice(0, salto).trim();
            buffer = buffer.slice(salto + 1);
            if (!linea) continue;
            try {
              const trozo = JSON.parse(linea);
              const texto = trozo?.message?.content;
              if (texto) controller.enqueue(encoder.encode(texto));
            } catch {
              // línea NDJSON incompleta o inválida — se ignora
            }
          }
        }
      } catch (e) {
        console.error("explicar-ia: stream de Ollama interrumpido", e);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
