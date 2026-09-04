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

  try {
    const respuesta = await responderIA(sistema, historial, mensaje);
    const m = respuesta.match(/<agendar>\s*(\{[\s\S]*?\})\s*<\/agendar>/);
    if (m) {
      const datos = JSON.parse(m[1]);
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
