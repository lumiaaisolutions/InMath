import { prisma, config } from "./db";
import { ahoraPared, etiqueta } from "./fechas";
import { slotsDisponibles, agendar, type Slot } from "./agenda";
import { upsertPorTelefono } from "./prospectos";
import { obtenerOCrearConversacion, registrarMensaje } from "./conversaciones";
import { linkParaProspecto } from "./pagos";

/**
 * Port de Bot\MotorBot: recibe un mensaje entrante de WhatsApp, arma el
 * contexto (prompt de BD + curso + historial), llama a Gemini, aplica la
 * decisión (calificación, traspaso, cita, pago) y persiste todo.
 * n8n solo transporta: webhook de Meta → POST /api/bot/procesar → envía
 * por WhatsApp las respuestas que este motor devuelve.
 */

type Turno = { role: "user" | "assistant"; content: string };
type Decision = {
  respuesta: string;
  accion: "continuar" | "ofrecer_cita" | "agendar_cita" | "pasar_asesor" | "listo_para_pago";
  calificacion: Record<string, unknown> | null;
  cita: { inicio?: string } | null;
};

export type Extras = { nombre?: string; fuente?: string; curso_interes_id?: number; wa_message_id?: string; tipo?: string };

export async function procesarMensajeBot(telefono: string, contenido: string, extras: Extras = {}) {
  const { prospecto: pIni } = await upsertPorTelefono(telefono, extras);
  let prospecto = pIni;
  const conversacion = await obtenerOCrearConversacion(prospecto.id);

  const registro = await registrarMensaje(conversacion.id, {
    direccion: "entrante", emisor: "prospecto", contenido,
    tipo: extras.tipo ?? "texto", wa_message_id: extras.wa_message_id ?? null,
  });
  if (registro.duplicado) return salida(prospecto, conversacion.id, [], "ninguna", true);

  // Conversación tomada por un asesor humano (o cerrada): el bot no interviene.
  if (conversacion.estado !== "bot") return salida(prospecto, conversacion.id, [], "ninguna");

  const decision = await decidir(prospecto, conversacion.id);

  if (decision.calificacion) prospecto = await aplicarCalificacion(prospecto, decision.calificacion);

  let accion: string = decision.accion;
  if (accion === "pasar_asesor") {
    const asignacion = await asignarMenorCarga(prospecto.id);
    await prisma.conversaciones.update({
      where: { id: conversacion.id },
      data: { estado: "asesor", asesor_id: asignacion ?? null },
    });
  }

  const respuestas: string[] = [];
  if (decision.respuesta !== "") respuestas.push(decision.respuesta);
  const extraSalida: Record<string, unknown> = {};

  if (accion === "ofrecer_cita") {
    const max = parseInt(await config("max_slots_ofrecidos", "6"), 10);
    const slots = await slotsDisponibles(null, 7, null, max);
    if (slots.length === 0) {
      respuestas.push("Por el momento no tengo horarios disponibles esta semana; un asesor te contactará para coordinar. 🙂");
      accion = "pasar_asesor";
    } else {
      respuestas.push(listarSlots(slots));
      extraSalida.slots = slots;
    }
  } else if (accion === "agendar_cita") {
    const r = await agendar(prospecto.id, decision.cita?.inicio ?? "");
    if ("error" in r) {
      respuestas.push("Ese horario acaba de ocuparse, una disculpa. Te comparto los horarios que siguen disponibles:");
      accion = "ofrecer_cita";
      const slots = await slotsDisponibles(null, 7, null, parseInt(await config("max_slots_ofrecidos", "6"), 10));
      if (slots.length) { respuestas.push(listarSlots(slots)); extraSalida.slots = slots; }
    } else {
      respuestas.push(`¡Listo! Tu cita quedó agendada para el ${etiqueta(r.cita.inicio)}. Te llegará la confirmación con el enlace de la videollamada por aquí. 🙂`);
      extraSalida.cita = r.cita;
      prospecto = (await prisma.prospectos.findUnique({ where: { id: prospecto.id } }))!;
    }
  } else if (accion === "listo_para_pago") {
    const resultado = await linkParaProspecto(prospecto);
    if (resultado.ok) {
      const monto = `$${(resultado.pago.monto_centavos / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${resultado.pago.moneda}`;
      respuestas.push(`Aquí tienes tu enlace de pago seguro por ${monto}:\n${resultado.pago.link_pago}\nEn cuanto se acredite, tu acceso al curso se activa automáticamente. 🙂`);
      extraSalida.pago = resultado.pago;
      prospecto = (await prisma.prospectos.findUnique({ where: { id: prospecto.id } }))!;
    } else {
      // Sin procesador configurado: el asesor envía el link manualmente.
      respuestas.push("En un momento uno de nuestros asesores te comparte el enlace de pago para completar tu inscripción.");
      const asignacion = await asignarMenorCarga(prospecto.id);
      await prisma.$executeRaw`UPDATE conversaciones SET estado = 'asesor', asesor_id = COALESCE(${asignacion}, asesor_id) WHERE id = ${conversacion.id}`;
      accion = "pasar_asesor";
    }
  }

  for (const texto of respuestas) {
    await registrarMensaje(conversacion.id, { direccion: "saliente", emisor: "bot", contenido: texto });
  }
  return { ...salida(prospecto, conversacion.id, respuestas, accion), ...extraSalida };
}

/** Asignación con menor carga (reusa la semántica de ProspectoServicio::asignar). */
async function asignarMenorCarga(prospectoId: number): Promise<number | null> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM usuarios WHERE es_asesor = 1 AND activo = 1 FOR UPDATE`;
    const filas = await tx.$queryRaw<{ id: number }[]>`
      SELECT u.id FROM usuarios u
      LEFT JOIN prospectos p ON p.asesor_id = u.id AND p.etapa NOT IN ('inscrito','descartado')
      WHERE u.es_asesor = 1 AND u.activo = 1
      GROUP BY u.id ORDER BY COUNT(p.id) ASC, u.id ASC LIMIT 1`;
    if (!filas.length) return null;
    const asesorId = Number(filas[0].id);
    await tx.prospectos.updateMany({ where: { id: prospectoId, asesor_id: null }, data: { asesor_id: asesorId, asignado_en: ahoraPared() } });
    const actual = await tx.prospectos.findUnique({ where: { id: prospectoId }, select: { asesor_id: true } });
    return actual?.asesor_id ?? asesorId;
  });
}

async function decidir(prospecto: { id: number; nombre: string | null; etapa: string; curso_interes_id: number | null }, conversacionId: number): Promise<Decision> {
  const sistema = await armarPromptSistema(prospecto);
  const historial = await armarHistorial(conversacionId);
  const modelo = await config("modelo_bot", process.env.GEMINI_MODEL ?? "gemini-3.6-flash");
  const crudo = await completarGemini(sistema, historial, modelo);
  return interpretar(crudo);
}

async function armarPromptSistema(prospecto: { nombre: string | null; etapa: string; curso_interes_id: number | null }): Promise<string> {
  const prompt = await prisma.prompts.findFirst({
    where: { clave: "sistema_bot", activo: true }, orderBy: { version: "desc" },
  });
  const base = prompt?.contenido ?? "Eres un asistente de ventas amable y profesional.";
  const curso = (prospecto.curso_interes_id
    ? await prisma.cursos.findUnique({ where: { id: prospecto.curso_interes_id } })
    : null) ?? await prisma.cursos.findFirst({ where: { activo: true }, orderBy: { id: "asc" } });

  const hoy = ahoraPared();
  const reemplazos: Record<string, string> = {
    "{{curso_nombre}}": curso?.nombre ?? "el curso",
    "{{curso_descripcion}}": curso?.descripcion ?? "",
    "{{curso_precio}}": curso ? `$${(curso.precio_centavos / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${curso.moneda}` : "por confirmar",
    "{{curso_duracion}}": curso?.duracion_semanas != null ? `${curso.duracion_semanas} semanas` : "por confirmar",
    "{{criterios_calificacion}}": await config("criterios_calificacion", "{}"),
    "{{nombre_prospecto}}": prospecto.nombre ?? "aún sin nombre",
    "{{etapa_prospecto}}": prospecto.etapa,
    "{{fecha_hoy}}": `${hoy.getUTCFullYear()}-${String(hoy.getUTCMonth() + 1).padStart(2, "0")}-${String(hoy.getUTCDate()).padStart(2, "0")}`,
  };
  return Object.entries(reemplazos).reduce((s, [k, v]) => s.split(k).join(v), base);
}

async function armarHistorial(conversacionId: number): Promise<Turno[]> {
  const limite = parseInt(await config("max_mensajes_contexto", "20"), 10);
  const filas = (await prisma.mensajes.findMany({
    where: { conversacion_id: conversacionId, tipo: { in: ["texto", "interactivo", "plantilla"] } },
    orderBy: { id: "desc" }, take: limite,
    select: { emisor: true, contenido: true },
  })).reverse();

  // La API exige roles alternados: fusiona mensajes consecutivos del mismo rol.
  const mensajes: Turno[] = [];
  for (const fila of filas) {
    const role = fila.emisor === "prospecto" ? "user" : "assistant";
    const ultimo = mensajes[mensajes.length - 1];
    if (ultimo && ultimo.role === role) ultimo.content += `\n${fila.contenido ?? ""}`;
    else mensajes.push({ role, content: fila.contenido ?? "" });
  }
  if (mensajes.length === 0 || mensajes[0].role !== "user") {
    mensajes.unshift({ role: "user", content: "(inicio de conversación)" });
  }
  return mensajes;
}

/** Port de Bot\GeminiClient::completar (con BOT_SIMULADO=1 para pruebas E2E). */
async function completarGemini(sistema: string, mensajes: Turno[], modelo: string, maxTokens = 1024): Promise<string> {
  if (process.env.BOT_SIMULADO === "1") return respuestaSimulada(mensajes);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Falta GEMINI_API_KEY");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sistema }] },
      contents: mensajes.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      // thinkingLevel bajo: sin esto Gemini gasta los tokens en razonamiento y el JSON llega cortado.
      generationConfig: { temperature: 0.5, maxOutputTokens: maxTokens, thinkingConfig: { thinkingLevel: "low" } },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const datos = await res.json().catch(() => ({}));
  if (res.status !== 200) {
    throw new Error(`API de Gemini respondió ${res.status}: ${datos?.error?.message ?? ""}`);
  }
  return (datos.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
}

/** Respuestas deterministas por palabra clave (mismas que el PHP) para probar el flujo. */
function respuestaSimulada(mensajes: Turno[]): string {
  let ultimo = "";
  for (let i = mensajes.length - 1; i >= 0; i--) {
    if (mensajes[i].role === "user") { ultimo = mensajes[i].content.toLowerCase(); break; }
  }
  const j = (o: unknown) => JSON.stringify(o);
  const opcion = ultimo.match(/opci[oó]n\s*(\d+)|^(\d)$/u);
  if (opcion) {
    const indice = parseInt(opcion[1] || opcion[2], 10) - 1;
    for (let i = mensajes.length - 1; i >= 0; i--) {
      if (mensajes[i].role !== "assistant") continue;
      const mm = [...mensajes[i].content.matchAll(/\((\d{4}-\d{2}-\d{2} \d{2}:\d{2})\)/g)];
      if (mm.length) {
        const inicio = mm[indice]?.[1] ?? mm[0][1];
        return j({ respuesta: "Perfecto, agendo tu cita en ese horario.", accion: "agendar_cita", cita: { inicio }, calificacion: null });
      }
    }
  }
  if (/asesor|humano|persona/.test(ultimo)) {
    return j({ respuesta: "Claro que sí, en un momento te comunico con uno de nuestros asesores para que te atienda personalmente.", accion: "pasar_asesor", calificacion: null });
  }
  if (/cita|llamada|videollamada|agendar/.test(ultimo)) {
    return j({ respuesta: "Con mucho gusto agendamos una sesión informativa. ¿Qué día y horario te acomodan mejor?", accion: "ofrecer_cita", calificacion: { urgencia: 4, fecha_examen: null, presupuesto: "desconocido" } });
  }
  if (/pagar|inscribir|comprar/.test(ultimo)) {
    return j({ respuesta: "Excelente decisión. Te comparto el enlace de pago seguro para completar tu inscripción.", accion: "listo_para_pago", calificacion: { urgencia: 5, fecha_examen: null, presupuesto: "si" } });
  }
  if (/examen|octubre|fecha/.test(ultimo)) {
    return j({ respuesta: "Gracias por contarme. Con esa fecha de examen, nuestro curso te da tiempo suficiente para prepararte bien. ¿Te gustaría conocer el temario?", accion: "continuar", calificacion: { urgencia: 4, fecha_examen: "2026-10-15", presupuesto: "desconocido" } });
  }
  return j({ respuesta: "¡Hola! Qué gusto saludarte. Soy el asistente de Cursos Inmath. ¿Te platico cómo funciona el curso?", accion: "continuar", calificacion: null });
}

/** Extrae el JSON de la respuesta del modelo; sin JSON válido degrada con gracia. */
function interpretar(crudo: string): Decision {
  const texto = crudo.trim();
  let json: Record<string, unknown> | null = null;
  const inicio = texto.indexOf("{"), fin = texto.lastIndexOf("}");
  if (inicio !== -1 && fin > inicio) {
    try { json = JSON.parse(texto.slice(inicio, fin + 1)); } catch { /* sin JSON */ }
  }
  if (!json || typeof json.respuesta !== "string") {
    return { respuesta: texto, accion: "continuar", calificacion: null, cita: null };
  }
  const acciones = ["continuar", "ofrecer_cita", "agendar_cita", "pasar_asesor", "listo_para_pago"];
  let accion = acciones.includes(String(json.accion)) ? (json.accion as Decision["accion"]) : "continuar";
  const cita = json.cita && typeof json.cita === "object" ? (json.cita as { inicio?: string }) : null;
  if (accion === "agendar_cita" && !cita?.inicio) accion = "ofrecer_cita";
  return {
    respuesta: json.respuesta,
    accion,
    calificacion: json.calificacion && typeof json.calificacion === "object" ? (json.calificacion as Record<string, unknown>) : null,
    cita,
  };
}

function listarSlots(slots: Slot[]): string {
  const lineas = ["Estos son los horarios disponibles para tu videollamada:"];
  slots.forEach((s, i) => lineas.push(`${i + 1}) ${s.etiqueta} (${s.inicio})`));
  lineas.push("Respóndeme con el número de la opción que prefieras.");
  return lineas.join("\n");
}

/** Port de aplicarCalificacion: fusiona datos, calcula puntaje y sube etapa. */
async function aplicarCalificacion(
  prospecto: { id: number; etapa: string; datos_calificacion: unknown },
  calificacion: Record<string, unknown>,
) {
  const previos = (prospecto.datos_calificacion && typeof prospecto.datos_calificacion === "object"
    ? prospecto.datos_calificacion : {}) as Record<string, unknown>;
  const datos = { ...previos };
  for (const [k, v] of Object.entries(calificacion)) {
    if (v !== null && v !== "desconocido") datos[k] = v;
  }

  let criterios: { pesos?: Record<string, number>; umbral?: number } = {};
  try { criterios = JSON.parse(await config("criterios_calificacion", "{}")) || {}; } catch { /* json corrupto */ }
  const pesos = criterios.pesos ?? { urgencia: 40, fecha_examen: 30, presupuesto: 30 };
  const umbral = criterios.umbral ?? 60;

  let puntaje = 0;
  if (datos.urgencia !== undefined) {
    puntaje += Math.round(Math.min(5, Math.max(1, Number(datos.urgencia))) / 5 * (pesos.urgencia ?? 0));
  }
  if (datos.fecha_examen) {
    const dias = (new Date(`${datos.fecha_examen}T00:00:00Z`).getTime() - ahoraPared().getTime()) / 86400_000;
    const factor = dias <= 90 ? 1.0 : dias <= 180 ? 0.5 : 0.25;
    puntaje += Math.round(factor * (pesos.fecha_examen ?? 0));
  }
  if (datos.presupuesto === "si") puntaje += pesos.presupuesto ?? 0;

  await prisma.prospectos.update({
    where: { id: prospecto.id },
    data: { datos_calificacion: datos as never, puntaje_calificacion: puntaje },
  });
  if (puntaje >= umbral && prospecto.etapa === "prospecto") {
    await prisma.prospectos.update({ where: { id: prospecto.id }, data: { etapa: "calificado" } });
    await prisma.bitacora_pipeline.create({
      data: { prospecto_id: prospecto.id, etapa_anterior: "prospecto", etapa_nueva: "calificado", origen: "bot", nota: `Puntaje ${puntaje} ≥ umbral ${umbral}` },
    });
  }
  return (await prisma.prospectos.findUnique({ where: { id: prospecto.id } }))!;
}

function salida(prospecto: { id: number; etapa: string }, conversacionId: number, respuestas: string[], accion: string, duplicado = false) {
  return {
    prospecto_id: prospecto.id,
    conversacion_id: conversacionId,
    etapa: prospecto.etapa,
    respuestas,
    accion,
    ...(duplicado ? { duplicado: true } : {}),
  };
}
