import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { slotsDisponibles, agendar } from "@/lib/agenda";
import { upsertPorTelefono, normalizaTelefono } from "@/lib/prospectos";
import { responderGemini, type Turno } from "@/lib/gemini";
import { enviarCorreo } from "@/lib/correo";
import { CONOCIMIENTO_EXANI } from "@/lib/conocimiento-exani";

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

  const slots = await slotsDisponibles(null, 7, null, 24);
  const lista = new Map(slots.map((s) => [s.inicio, s.etiqueta]));
  const slotsTexto = lista.size === 0
    ? "(por ahora no hay horarios disponibles esta semana)"
    : [...lista].map(([k, v]) => `- ${k} → ${v}`).join("\n");

  const sistema =
    "Eres Mathy, el asistente de IA de Cursos InMath. Respondes en español, con tono cálido y ligeramente formal, siempre de tú, breve y concreto (máximo 3-4 frases). Nunca inventes datos." +
    "\n\nINFORMACIÓN OFICIAL DEL CURSO:" +
    "\n- Nombre: Curso Propedéutico InMath. Precio: $4,500 MXN con $500 de descuento si te inscribes en el momento (queda en $4,000)." +
    "\n- Dos modalidades al mismo precio: Premium (8 meses) e Intensivo (3 meses, para escuelas con examen en noviembre)." +
    "\n- 100% en línea: clases grabadas 24/7 + asesorías personalizadas por videollamada (1 hora cada una). Material incluido sin costo extra." +
    "\n- Asesorías gratuitas de orientación: todos los días de 8:00 a 21:00, de 30 minutos." +
    "\n- Fecha de inicio, si aplica a una escuela/carrera específica o costo de asesorías extra: NO lo inventes; invita a la asesoría gratuita o a WhatsApp para confirmarlo." +
    "\n\n" + CONOCIMIENTO_EXANI +
    "\n\nHORARIOS DISPONIBLES REALES para asesoría gratuita (única fuente válida):\n" + slotsTexto +
    "\n\nREGLAS PARA AGENDAR (obligatorias):" +
    "\n1. Solo ofrece horarios de la lista. Si piden uno que no está, dilo y ofrece los 2-3 más cercanos." +
    "\n2. Para agendar necesitas: nombre, WhatsApp de 10 dígitos, su CORREO y UN horario exacto de la lista. Avísale: \"tu confirmación se enviará por correo\"; si no te ha dado el correo, pídeselo. Si no quiere darlo, agenda sin correo." +
    '\n3. Con los datos confirmados responde ÚNICAMENTE: <agendar>{"nombre":"NOMBRE","telefono":"10DIGITOS","correo":"CORREO_O_VACIO","inicio":"YYYY-MM-DD HH:MM"}</agendar>' +
    "\n4. NUNCA digas que la cita quedó agendada tú mismo: el sistema la agenda al recibir el comando. Sin comando, la cita NO existe." +
    "\n\nCONTACTO HUMANO: si el usuario pide hablar con una persona/asesor humano, está molesto, o su caso necesita atención personal, dile con calidez que puede escribirle directo a un asesor y TERMINA tu respuesta con la etiqueta exacta [CONTACTO_HUMANO] (el sitio la convierte en un botón de WhatsApp). No inventes números ni links. El correo de contacto del negocio es cursosinmath@gmail.com (compártelo solo si piden un correo)." +
    "\n\nINTERACTIVIDAD (el sitio convierte estas etiquetas en botones; úsalas siempre que apliquen):" +
    "\n- Al ofrecer horarios, tras tu texto agrega [OPCIONES: etiqueta1 | etiqueta2 | etiqueta3] con 2-3 etiquetas legibles EXACTAS de la lista." +
    "\n- Si quiere asesoría y no ha dicho cómo, pregunta si la agendas tú aquí mismo o prefiere elegir en el calendario, y agrega [OPCIONES: Agéndala por mí | Prefiero agendarla yo]. Si elige agendarla él, invítalo con calidez y agrega [IR_AGENDA]." +
    "\n- En preguntas de sí/no agrega [OPCIONES: Sí | No]." +
    "\n- Nunca describas las etiquetas al usuario; solo agrégalas al final del mensaje.";

  try {
    const respuesta = await responderGemini(sistema, historial, mensaje);
    const m = respuesta.match(/<agendar>\s*(\{[\s\S]*?\})\s*<\/agendar>/);
    if (m) {
      const datos = JSON.parse(m[1]);
      const nombre = String(datos.nombre ?? "").trim();
      const telefono = normalizaTelefono(String(datos.telefono ?? ""));
      const inicio = String(datos.inicio ?? "").trim();
      const correo = String(datos.correo ?? "").trim().toLowerCase();
      const correoOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo);
      if (!nombre || !telefono || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(inicio) || !lista.has(inicio)) {
        return NextResponse.json({ respuesta: "Me falta confirmar bien tus datos: dime tu nombre, tu WhatsApp de 10 dígitos y elige uno de los horarios disponibles que te compartí." });
      }
      const { prospecto } = await upsertPorTelefono(telefono, { nombre, fuente: "organico" });
      const cambios: { nombre?: string; correo?: string } = {};
      if (!prospecto.nombre) cambios.nombre = nombre;
      if (correoOk && prospecto.correo !== correo) cambios.correo = correo;
      if (Object.keys(cambios).length) await prisma.prospectos.update({ where: { id: prospecto.id }, data: cambios });
      const r = await agendar(prospecto.id, inicio);
      if ("error" in r) {
        return NextResponse.json({ respuesta: `Ese horario se acaba de ocupar. ¿Te late alguno de estos? ${[...lista.values()].slice(0, 3).join(" · ")}` });
      }
      let porCorreo = false;
      if (correoOk) {
        const envio = await enviarCorreo({
          para: [correo],
          asunto: "Tu asesoría gratuita está confirmada — Cursos InMath",
          texto: `Hola ${nombre},\n\nTu asesoría gratuita quedó agendada para el ${lista.get(inicio)}.\nUn asesor te contactará por WhatsApp con el enlace de la videollamada.\n\n¡Nos vemos!`,
        });
        porCorreo = envio.enviado;
      }
      return NextResponse.json({
        respuesta: `¡Listo, ${nombre}! Tu asesoría gratuita quedó agendada para el ${lista.get(inicio)}. Te llegará la confirmación por WhatsApp${porCorreo ? " y ya te enviamos la confirmación a tu correo" : ""}. ¡Nos vemos!`,
        agendado: true,
      });
    }
    return NextResponse.json({ respuesta });
  } catch (e) {
    console.error("[agente]", e);
    return NextResponse.json({ error: "No pude conectarme en este momento. Intenta de nuevo en unos segundos." }, { status: 502 });
  }
}
