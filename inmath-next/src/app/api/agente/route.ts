import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { agendar } from "@/lib/agenda";
import { upsertPorTelefono, normalizaTelefono } from "@/lib/prospectos";
import { type Turno } from "@/lib/gemini";
import { responderIA } from "@/lib/ia";
import { sistemaAgenteSitio } from "@/lib/agente-sitio";

// Rate limit en memoria por IP: 20 mensajes / 10 min (port del PHP por sesión).
const hits = new Map<string, number[]>();

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

  // PASOS GUIADOS DETERMINÍSTICOS (04-sep-2026): con el modelo local chico,
  // los primeros pasos del agendado no se dejan al criterio de la IA — el
  // servidor responde fijo y con los horarios REALES. La IA entra después,
  // para la conversación libre y la recolección de datos.
  const txt = mensaje.toLowerCase();
  const etiquetas = [...lista.values()];
  if (/quiero agendar|agendar mi asesor|asesor[ií]a gratis/.test(txt) && !/ag[eé]ndala por m[ií]|prefiero agendarla/.test(txt)) {
    return NextResponse.json({
      respuesta: "¡Claro! Puedo agendar tu asesoría gratuita de 30 minutos aquí mismo, o si prefieres eliges tu horario directo en el calendario. ¿Cómo le hacemos? [OPCIONES: Agéndala por mí | Prefiero agendarla yo]",
    });
  }
  if (/ag[eé]ndala por m[ií]/.test(txt)) {
    const proximos = etiquetas.slice(0, 3);
    return NextResponse.json({
      respuesta: proximos.length
        ? `¡Va! Estos son los horarios más próximos disponibles. Elige uno y compárteme tu nombre, tu WhatsApp de 10 dígitos y tu correo (ahí te llega el enlace de tu asesoría en línea). [OPCIONES: ${proximos.join(" | ")}]`
        : "Por ahora no veo horarios disponibles esta semana — puedes revisar el calendario completo, ahí aparecen en cuanto se abren. [IR_AGENDA]",
    });
  }
  if (/prefiero agendarla yo/.test(txt)) {
    return NextResponse.json({
      respuesta: "¡Perfecto! En el calendario eliges el día y la hora que mejor te acomoden, y ahí mismo dejas tus datos. [IR_AGENDA]",
    });
  }

  try {
    const respuesta = await responderIA(sistema, historial, mensaje);
    const m = respuesta.match(/<agendar>\s*(\{[\s\S]*?\})\s*<\/agendar>/);
    // Blindaje para el modelo local: si emitió un <agendar> malformado, con
    // placeholders o sin cierre, el visitante JAMÁS debe ver el comando
    // crudo — se detecta cualquier rastro y se convierte en la petición de
    // datos de siempre.
    const PEDIR_DATOS = "¡Perfecto! Para agendarte solo necesito cuatro datos: tu nombre, tu WhatsApp de 10 dígitos, tu correo (ahí te llega el enlace de la asesoría en línea) y el horario que prefieras de los disponibles. ¿Me los compartes?";
    if (!m && respuesta.includes("<agendar>")) {
      return NextResponse.json({ respuesta: PEDIR_DATOS });
    }
    if (m) {
      let datos: { nombre?: unknown; telefono?: unknown; correo?: unknown; inicio?: unknown };
      try { datos = JSON.parse(m[1]); } catch { return NextResponse.json({ respuesta: PEDIR_DATOS }); }
      const placeholder = /tu nombre|10digitos|nombre completo|ejemplo/i;
      if (placeholder.test(String(datos.nombre ?? "")) || placeholder.test(String(datos.telefono ?? ""))) {
        return NextResponse.json({ respuesta: PEDIR_DATOS });
      }
      const nombre = String(datos.nombre ?? "").trim();
      const telefono = normalizaTelefono(String(datos.telefono ?? ""));
      const inicio = String(datos.inicio ?? "").trim();
      const correo = String(datos.correo ?? "").trim().toLowerCase();
      const correoOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo);
      if (!nombre || !telefono || !correoOk || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(inicio) || !lista.has(inicio)) {
        return NextResponse.json({ respuesta: "Me falta confirmar bien tus datos: dime tu nombre, tu WhatsApp de 10 dígitos, tu correo (ahí te llega el enlace de la asesoría en línea) y elige uno de los horarios disponibles que te compartí." });
      }
      const { prospecto } = await upsertPorTelefono(telefono, { nombre, fuente: "organico" });
      const cambios: { nombre?: string; correo?: string } = {};
      if (!prospecto.nombre) cambios.nombre = nombre;
      if (prospecto.correo !== correo) cambios.correo = correo;
      if (Object.keys(cambios).length) await prisma.prospectos.update({ where: { id: prospecto.id }, data: cambios });
      const r = await agendar(prospecto.id, inicio, correo);
      if ("error" in r) {
        return NextResponse.json({ respuesta: `Ese horario se acaba de ocupar. ¿Te late alguno de estos? ${[...lista.values()].slice(0, 3).join(" · ")}` });
      }
      return NextResponse.json({
        respuesta: `¡Listo, ${nombre}! Tu asesoría gratuita quedó agendada para el ${lista.get(inicio)}. Te llegará la confirmación con el enlace a tu correo. ¡Nos vemos!`,
        agendado: true,
      });
    }
    return NextResponse.json({ respuesta });
  } catch (e) {
    console.error("[agente]", e);
    return NextResponse.json({ error: "No pude conectarme en este momento. Intenta de nuevo en unos segundos." }, { status: 502 });
  }
}
