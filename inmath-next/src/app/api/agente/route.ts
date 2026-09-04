import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { agendar } from "@/lib/agenda";
import { upsertPorTelefono, normalizaTelefono } from "@/lib/prospectos";
import { type Turno } from "@/lib/gemini";
import { responderIA } from "@/lib/ia";
import { sistemaAgenteSitio } from "@/lib/agente-sitio";

// Rate limit en memoria por IP: 20 mensajes / 10 min (port del PHP por sesión).
const hits = new Map<string, number[]>();

/** Pregunta fija del flujo determinístico — también sirve de MARCADOR de
 *  estado: si el último mensaje del bot empieza así, la siguiente respuesta
 *  del usuario se toma como su nombre. */
const PREGUNTA_NOMBRE = "Ya casi ✨ ¿A nombre de quién agendo la asesoría?";

const NOMBRE_RE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ.' -]{1,59}$/;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const ahora = Date.now();
  const previos = (hits.get(ip) ?? []).filter((t) => t > ahora - 600_000);
  if (previos.length >= 20) return NextResponse.json({ error: "Muchos mensajes seguidos. Espera unos minutos." }, { status: 429 });
  previos.push(ahora); hits.set(ip, previos);

  const body = await req.json().catch(() => null);
  const mensaje = String(body?.mensaje ?? "").trim();
  if (!mensaje || mensaje.length > 800) return NextResponse.json({ error: "Escribe un mensaje válido." }, { status: 400 });
  const historial: Turno[] = Array.isArray(body?.historial)
    ? body.historial.slice(-12).map((t: Turno) => ({ rol: t.rol === "asistente" ? "asistente" : "usuario", texto: String(t.texto ?? "") }))
    : [];

  const { sistema, lista } = await sistemaAgenteSitio();

  // ════ AGENDADO 100% DETERMINÍSTICO (04-sep-2026) ═══════════════════════
  // El modelo local chico demostró que NO se le puede confiar el agendado
  // (soltaba el comando crudo, se saltaba horarios, entraba en bucles). El
  // SERVIDOR detecta horario/teléfono/correo/nombre en la conversación, va
  // confirmando qué anotó y qué falta, y agenda él mismo. La IA queda solo
  // para preguntas libres del curso.
  const txt = mensaje.toLowerCase();
  const etiquetas = [...lista.values()];

  // Paso 1: intención de agendar → opciones fijas.
  if (/quiero agendar|agendar mi asesor|asesor[ií]a gratis/.test(txt) && !/ag[eé]ndala por m[ií]|prefiero agendarla/.test(txt)) {
    return NextResponse.json({
      respuesta: "¡Claro! Puedo agendar tu asesoría gratuita de 30 minutos aquí mismo, o si prefieres eliges tu horario directo en el calendario. ¿Cómo le hacemos? [OPCIONES: Agéndala por mí | Prefiero agendarla yo]",
    });
  }
  // Paso 2a: que la agende Mathy → horarios REALES como botones.
  if (/ag[eé]ndala por m[ií]/.test(txt)) {
    const proximos = etiquetas.slice(0, 3);
    return NextResponse.json({
      respuesta: proximos.length
        ? `¡Va! Estos son los horarios más próximos disponibles. Elige uno y compárteme tu nombre, tu WhatsApp de 10 dígitos y tu correo (ahí te llega el enlace de tu asesoría en línea). [OPCIONES: ${proximos.join(" | ")}]`
        : "Por ahora no veo horarios disponibles esta semana — puedes revisar el calendario completo, ahí aparecen en cuanto se abren. [IR_AGENDA]",
    });
  }
  // Paso 2b: prefiere el calendario.
  if (/prefiero agendarla yo/.test(txt)) {
    return NextResponse.json({
      respuesta: "¡Perfecto! En el calendario eliges el día y la hora que mejor te acomoden, y ahí mismo dejas tus datos. [IR_AGENDA]",
    });
  }

  // Paso 3: recolección — busca los 4 datos en TODA la conversación.
  const delUsuario = [...historial.filter((t) => t.rol === "usuario").map((t) => t.texto), mensaje];
  const todo = delUsuario.join("\n");

  const correo = (todo.match(/[\w.+-]+@[\w-]+(?:\.[\w-]{2,})+/g)?.pop() ?? "").toLowerCase();
  const telCrudo = todo.replace(/[ .()-]/g, "").match(/\d{10,13}/g)?.pop() ?? "";
  const telefono = telCrudo ? (normalizaTelefono(telCrudo) ?? "") : "";

  // Horario: el usuario tocó un botón con la etiqueta EXACTA de la lista
  // (o la escribió); se toma la última mencionada.
  let inicioSel: string | null = null;
  for (const [ini, etq] of lista) {
    if (delUsuario.some((m) => m.toLowerCase().includes(etq.toLowerCase()))) inicioSel = ini;
  }

  // Nombre: (a) respuesta directa a PREGUNTA_NOMBRE, o (b) lo que queda del
  // mensaje que trae teléfono/correo al quitar esos datos y muletillas.
  const ultimoBot = [...historial].reverse().find((t) => t.rol === "asistente")?.texto ?? "";
  let nombre = "";
  if (ultimoBot.startsWith("Ya casi") && NOMBRE_RE.test(mensaje) && !/@|\d{6,}/.test(mensaje)) {
    nombre = mensaje.trim();
  } else {
    for (const m of [...delUsuario].reverse()) {
      if (!(correo && m.toLowerCase().includes(correo)) && !(telCrudo && m.replace(/[ .()-]/g, "").includes(telCrudo))) continue;
      const limpio = m
        .replace(new RegExp(correo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), " ")
        .replace(/[\d|]+/g, " ")
        .replace(/\b(y|e|mi|el|la|es|soy|me llamo|nombre|correo|mail|whatsapp|tel[eé]fono|numero|número|dato|datos|son|aqu[ií] est[aá]n)\b/gi, " ")
        .replace(/[,;:()"]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (NOMBRE_RE.test(limpio) && limpio.includes(" ") === true || (NOMBRE_RE.test(limpio) && limpio.length >= 3)) {
        nombre = limpio;
        break;
      }
    }
  }

  // ¿Estamos en flujo de agendado? (eligió horario, o ya soltó tel/correo,
  // o el bot acaba de preguntar el nombre)
  // También cuenta como flujo si el usuario intentó escribir una fecha/hora
  // (aunque no coincida con la lista — se le reencarrila con los botones) o
  // si el bot acababa de ofrecer horarios.
  const intentoHorario = /(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|\d{1,2}:\d{2})/.test(txt);
  const botOfrecioHorarios = /\[OPCIONES:.*(septiembre|octubre|noviembre|diciembre|enero|febrero|marzo|abril|mayo|junio|julio|agosto)/i.test(ultimoBot);
  const enFlujo = Boolean(inicioSel || ((telefono || correo) && etiquetas.length) || ultimoBot.startsWith("Ya casi") || intentoHorario || botOfrecioHorarios);
  if (enFlujo && etiquetas.length) {
    const anotado: string[] = [];
    if (inicioSel) anotado.push(`horario ${lista.get(inicioSel)}`);
    if (telefono) anotado.push(`WhatsApp ${telefono.slice(-10)}`);
    if (correo) anotado.push(`correo ${correo}`);
    if (nombre) anotado.push(`a nombre de ${nombre}`);
    const resumen = anotado.length ? `Voy anotando: ${anotado.join(" · ")}. ` : "";

    if (!inicioSel) {
      return NextResponse.json({
        respuesta: `${resumen}Ahora elige el horario de tu asesoría: [OPCIONES: ${etiquetas.slice(0, 3).join(" | ")}]`,
      });
    }
    const faltan: string[] = [];
    if (!telefono) faltan.push("tu WhatsApp de 10 dígitos");
    if (!correo) faltan.push("tu correo (ahí te llega el enlace de tu asesoría en línea)");
    if (faltan.length) {
      return NextResponse.json({ respuesta: `${resumen}Me falta ${faltan.join(" y ")}. ¿Me lo compartes?` });
    }
    if (!nombre) {
      return NextResponse.json({ respuesta: `${resumen}${PREGUNTA_NOMBRE}` });
    }

    // Los 4 datos listos → agenda el SERVIDOR, sin IA de por medio.
    const { prospecto } = await upsertPorTelefono(telefono, { nombre, fuente: "organico" });
    const cambios: { nombre?: string; correo?: string } = {};
    if (!prospecto.nombre) cambios.nombre = nombre;
    if (prospecto.correo !== correo) cambios.correo = correo;
    if (Object.keys(cambios).length) await prisma.prospectos.update({ where: { id: prospecto.id }, data: cambios });
    const r = await agendar(prospecto.id, inicioSel, correo);
    if ("error" in r) {
      return NextResponse.json({ respuesta: `Ese horario se acaba de ocupar 😔 ¿Te late alguno de estos? [OPCIONES: ${etiquetas.slice(0, 3).join(" | ")}]` });
    }
    return NextResponse.json({
      respuesta: `¡Listo, ${nombre}! Tu asesoría gratuita quedó agendada para el ${lista.get(inicioSel)}. Te llegará la confirmación con el enlace a tu correo. ¡Nos vemos!`,
      agendado: true,
    });
  }
  // ════ FIN del agendado determinístico ══════════════════════════════════

  try {
    const respuesta = await responderIA(sistema, historial, mensaje);
    // La IA ya NO agenda: si aun así intenta emitir el comando, el visitante
    // jamás lo ve — se convierte en el arranque del flujo guiado.
    if (respuesta.includes("<agendar")) {
      return NextResponse.json({
        respuesta: "¡Perfecto! Agendemos tu asesoría gratuita. ¿La agendo yo aquí mismo o prefieres elegir en el calendario? [OPCIONES: Agéndala por mí | Prefiero agendarla yo]",
      });
    }
    return NextResponse.json({ respuesta });
  } catch (e) {
    console.error("[agente]", e);
    return NextResponse.json({ error: "No pude conectarme en este momento. Intenta de nuevo en unos segundos." }, { status: 502 });
  }
}
