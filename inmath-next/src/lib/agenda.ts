import { prisma, config } from "./db";
import { etiqueta, isoMinuto, diaSemanaN, isoDia, ahoraPared, paredDesde } from "./fechas";
import { lunesDe, lunesEnRango, overridesDe } from "./disponibilidad";
import { enviarCorreo, CORREO_CONTACTO } from "./correo";
import { crearEventoDirecto, borrarEventoDirecto } from "./google-calendar";

const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type Slot = { inicio: string; fin: string; etiqueta: string; asesores_libres: number[] };

/** Port fiel de AgendaServicio::slotsDisponibles (misma semántica y límites). */
export async function slotsDisponibles(desde: Date | null = null, dias = 7, asesorId: number | null = null, max = 30, maxPorDia = 12): Promise<Slot[]> {
  const duracionMin = parseInt(await config("duracion_cita_minutos", "30"), 10);

  const asesores = (
    await prisma.usuarios.findMany({ where: { es_asesor: true, activo: true, ...(asesorId ? { id: asesorId } : {}) }, select: { id: true } })
  ).map((u) => u.id);
  if (asesores.length === 0) return [];

  const ahora = ahoraPared();
  const inicioRango = new Date(Math.max((desde ?? ahora).getTime(), ahora.getTime()));
  const finRango = new Date(inicioRango.getTime() + dias * 86400_000);
  const ocupadas = await prisma.citas.findMany({
    where: { estado: { in: ["agendada", "confirmada"] }, inicio: { lt: finRango }, fin: { gt: inicioRango } },
    select: { asesor_id: true, inicio: true, fin: true },
  });

  const minimo = ahora.getTime() + 3600_000; // 1h de anticipación
  const slots: Slot[] = [];
  const dia0 = new Date(inicioRango); dia0.setUTCHours(0, 0, 0, 0);
  // Overrides por semana (si el admin ajustó una semana, mandan sobre el base).
  const overrides = await overridesDe(lunesEnRango(dia0, finRango));
  for (let dia = new Date(dia0); dia < finRango && slots.length < max; dia = new Date(dia.getTime() + 86400_000)) {
    const dow = diaSemanaN(dia);
    const ov = overrides[isoDia(lunesDe(dia))];
    // Sin horario de respaldo: si la semana de este día no tiene override
    // definido a mano, ese día simplemente no ofrece horarios.
    if (!ov) continue;
    const dd = ov.dias[String(dow)];
    if (!dd || !dd.on || !dd.horas.length) continue;
    const horasDia: Date[] = dd.horas.map((hhmm) => {
      const [h, m] = hhmm.split(":").map(Number);
      const t = new Date(dia); t.setUTCHours(h, m, 0, 0);
      return t;
    });
    // Tope POR DÍA (además del tope global `max`): sin esto, un día con muchas
    // horas definidas (ej. cada hora de 8am a 8pm) agota `max` por sí solo y
    // los días siguientes —incluida la semana próxima— nunca llegan a mostrarse.
    let contadorDia = 0;
    for (const t of horasDia) {
      if (slots.length >= max || contadorDia >= maxPorDia) break;
      if (t.getTime() < minimo) continue;
      const fin = new Date(t.getTime() + duracionMin * 60_000);
      const libres = asesores.filter((a) =>
        !ocupadas.some((c) => c.asesor_id === a && c.inicio < fin && c.fin > t)
      );
      if (libres.length) { slots.push({ inicio: isoMinuto(t), fin: isoMinuto(fin), etiqueta: etiqueta(t), asesores_libres: libres }); contadorDia++; }
    }
  }
  return slots;
}

/** Avisa a n8n (workflow 03) y espera a que cree el evento real en Google
 *  Calendar + Meet (responde solo cuando termina). Si n8n no está
 *  configurado, no responde o falla, regresa null — la cita ya quedó
 *  agendada de todos modos, solo falta el link (el admin puede pegarlo a
 *  mano desde /panel/citas como respaldo). */
async function crearEventoCalendar(cita: { id: number; asesor_id: number; inicio: Date; fin: Date }, prospectoNombre: string | null): Promise<string | null> {
  const base = process.env.N8N_BASE_URL;
  if (!base) return null;
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/webhook/cita-creada`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cita: { id: cita.id, asesor_id: cita.asesor_id, inicio: isoMinuto(cita.inicio), fin: isoMinuto(cita.fin) },
        prospecto_nombre: prospectoNombre,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const datos = await res.json().catch(() => null);
    return datos?.meet_link ?? null;
  } catch (e) {
    console.error("crearEventoCalendar: n8n no respondió", e);
    return null;
  }
}

/** CADENA completa para conseguir el link de Meet de una cita:
 *  1) el robot (n8n); 2) si falla, el sitio crea el evento DIRECTO con la
 *  cuenta de Google conectada en /panel/configuracion. Devuelve null solo si
 *  ambos fallan (ahí entran la alerta roja del panel, el correo urgente y
 *  los reintentos automáticos de /api/citas/reparar-links). */
export async function conseguirLinkCita(cita: { id: number; asesor_id: number; inicio: Date; fin: Date }, prospectoNombre: string | null): Promise<{ link: string | null; via: "n8n" | "directo" | null }> {
  const porN8n = await crearEventoCalendar(cita, prospectoNombre);
  if (porN8n) return { link: porN8n, via: "n8n" };

  // ANTI-DUPLICADOS 1: que n8n "falle" puede ser solo LENTITUD (pasó el
  // timeout de 20s pero su evento sí se creó y su PATCH llegó después).
  // Antes de crear otro evento, espera unos segundos y re-lee la cita: si
  // el link del robot ya aterrizó, se usa ese y NO se crea un segundo.
  for (let i = 0; i < 2; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    const fila = await prisma.citas.findUnique({ where: { id: cita.id }, select: { meet_link: true } });
    if (fila?.meet_link) return { link: fila.meet_link, via: "n8n" };
  }

  const directo = await crearEventoDirecto(cita, prospectoNombre);
  if (!directo) return { link: null, via: null };

  // ANTI-DUPLICADOS 2: guardado atómico "el primero gana". Si justo en esta
  // ventana el robot guardó su link (updateMany no encuentra meet_link nulo),
  // el evento del respaldo se BORRA del calendario y se usa el del robot.
  const gano = await prisma.citas.updateMany({ where: { id: cita.id, meet_link: null }, data: { meet_link: directo.link } });
  if (gano.count === 0) {
    if (directo.eventId) await borrarEventoDirecto(directo.eventId);
    const fila = await prisma.citas.findUnique({ where: { id: cita.id }, select: { meet_link: true } });
    return { link: fila?.meet_link ?? directo.link, via: "n8n" };
  }
  return { link: directo.link, via: "directo" };
}

/** Correo al prospecto CON su link de Meet — se usa al agendar (si el link
 *  nació a tiempo) y también cuando el link llega DESPUÉS (reintento
 *  automático o pegado a mano en el panel): el sistema se lo reenvía solo,
 *  sin depender de que alguien se acuerde. */
export async function correoLinkProspecto(correo: string, nombre: string | null, cuando: string, meetLink: string, tardio = false) {
  await enviarCorreo({
    para: [correo],
    asunto: tardio ? "El enlace de tu asesoría — Cursos InMath" : "Tu asesoría está confirmada — Cursos InMath",
    preheader: "Aquí está el enlace de tu asesoría en línea.",
    texto: tardio
      ? `Hola ${nombre ?? ""},\n\nAquí está el enlace de tu asesoría en línea del ${cuando}. Guárdalo y únete en ese horario con un clic.`
      : `Hola ${nombre ?? ""},\n\nTu asesoría quedó agendada para el ${cuando}. Toca el botón para unirte a tu asesoría en línea en ese horario.`,
    cta: { url: meetLink, label: "Unirme a mi asesoría en línea", icono: "calendario" as const },
  }).catch((e) => console.error("correoLinkProspecto: no se pudo enviar", e));
}

/** Manda la única confirmación de la cita al prospecto: por correo, con el
 *  link de Meet si ya se generó (espera a n8n antes de mandarla), o con
 *  aviso de que llega en breve si no. Además avisa al buzón de contacto
 *  (staff) que hay una asesoría nueva, con el mismo enlace de Meet, para
 *  que el asesor no dependa de revisar el panel para enterarse. */
async function confirmarCitaPorCorreo(
  cita: { id: number; asesor_id: number; inicio: Date; fin: Date },
  correo: string,
  nombre: string | null,
  telefono: string | null,
) {
  const { link: meetLink } = await conseguirLinkCita(cita, nombre);
  if (meetLink) await prisma.citas.update({ where: { id: cita.id }, data: { meet_link: meetLink } });
  const cuando = etiqueta(cita.inicio);

  const [asesor] = await Promise.all([
    prisma.usuarios.findUnique({ where: { id: cita.asesor_id }, select: { nombre: true } }),
    meetLink
      ? correoLinkProspecto(correo, nombre, cuando, meetLink)
      : enviarCorreo({
          para: [correo],
          asunto: "Tu asesoría está confirmada — Cursos InMath",
          preheader: "Tu cita quedó agendada, en breve te compartimos el enlace.",
          texto: `Hola ${nombre ?? ""},\n\nTu asesoría quedó agendada para el ${cuando}. En unos minutos te llega otro correo con el enlace de tu asesoría en línea — si no llega, un asesor te lo comparte antes de tu cita.`,
        }).catch((e) => console.error("confirmarCitaPorCorreo: no se pudo enviar el correo", e)),
  ]);

  await enviarCorreo({
    para: [CORREO_CONTACTO],
    asunto: meetLink
      ? `Nueva asesoría agendada — ${nombre ?? "prospecto sin nombre"}`
      : `⚠️ URGENTE: asesoría SIN enlace de Meet — ${nombre ?? "prospecto sin nombre"}`,
    preheader: meetLink ? "Ya tiene enlace de Meet." : "El cliente NO recibió link. El sistema reintenta solo; si no, pégalo desde la ficha.",
    texto: `${asesor?.nombre ?? "Un asesor"} tiene una asesoría agendada para el ${cuando}.\n\nProspecto: ${nombre ?? "(sin nombre)"}\nWhatsApp: ${telefono ?? "(sin teléfono)"}\nCorreo: ${correo}`,
    ...(meetLink
      ? { cta: { url: meetLink, label: "Unirme a la asesoría en línea", icono: "calendario" as const } }
      : { nota: "No se pudo generar el enlace de Meet (ni por n8n ni por el respaldo directo). El sistema lo REINTENTA solo cada 10 minutos y se lo envía al cliente en cuanto exista; también puedes generarlo o pegarlo desde la ficha del prospecto — al guardarlo, el correo al cliente sale automático." }),
  }).catch((e) => console.error("confirmarCitaPorCorreo: no se pudo avisar al staff", e));
}

/** Intenta conseguir el link de una cita que quedó SIN él (robot → directo);
 *  si lo logra, lo guarda y SE LO ENVÍA al prospecto automáticamente.
 *  Lo usan el reintento automático (/api/citas/reparar-links, cron cada 10
 *  min) y el botón "Generar link" de la ficha del prospecto. */
export async function repararLinkCita(citaId: number): Promise<{ ok: boolean; link?: string; error?: string }> {
  const cita = await prisma.citas.findUnique({
    where: { id: citaId },
    select: { id: true, asesor_id: true, inicio: true, fin: true, meet_link: true, estado: true, prospectos: { select: { nombre: true, correo: true } } },
  });
  if (!cita) return { ok: false, error: "Cita no encontrada" };
  if (cita.meet_link) return { ok: true, link: cita.meet_link };
  if (!["agendada", "confirmada"].includes(cita.estado)) return { ok: false, error: "La cita ya no está activa" };

  const { link } = await conseguirLinkCita(cita, cita.prospectos?.nombre ?? null);
  if (!link) return { ok: false, error: "Ni el robot (n8n) ni el respaldo directo pudieron generar el enlace" };

  await prisma.citas.update({ where: { id: citaId }, data: { meet_link: link } });
  const correo = cita.prospectos?.correo;
  if (correo && CORREO_RE.test(correo)) {
    await correoLinkProspecto(correo, cita.prospectos?.nombre ?? null, etiqueta(cita.inicio), link, true);
  }
  // Cierra el ciclo con el STAFF: si hubo aviso urgente, este correo lo
  // resuelve — ya no tienen que revisar el panel para saber que se arregló.
  await enviarCorreo({
    para: [CORREO_CONTACTO],
    asunto: `✅ Resuelto: la asesoría de ${cita.prospectos?.nombre ?? "(sin nombre)"} ya tiene su enlace`,
    preheader: "El enlace se generó y ya se le envió al cliente por correo.",
    texto: `La asesoría del ${etiqueta(cita.inicio)} (cita #${cita.id}) ya tiene enlace de Meet y el cliente ya lo recibió por correo automáticamente. No hay nada más que hacer.`,
    cta: { url: link, label: "Unirme a la asesoría en línea", icono: "calendario" as const },
  }).catch((e) => console.error("repararLinkCita: no se pudo avisar al staff", e));
  return { ok: true, link };
}

/** Guarda un link pegado A MANO por el staff y se lo envía al prospecto
 *  automáticamente (mismo correo que el reintento — nadie tiene que
 *  acordarse de reenviarlo). */
export async function guardarLinkManual(citaId: number, link: string): Promise<{ ok: boolean; error?: string }> {
  const cita = await prisma.citas.findUnique({
    where: { id: citaId },
    select: { id: true, inicio: true, estado: true, prospectos: { select: { nombre: true, correo: true } } },
  });
  if (!cita) return { ok: false, error: "Cita no encontrada" };
  await prisma.citas.update({ where: { id: citaId }, data: { meet_link: link } });
  const correo = cita.prospectos?.correo;
  if (correo && CORREO_RE.test(correo)) {
    await correoLinkProspecto(correo, cita.prospectos?.nombre ?? null, etiqueta(cita.inicio), link, true);
  }
  await enviarCorreo({
    para: [CORREO_CONTACTO],
    asunto: `✅ Resuelto: la asesoría de ${cita.prospectos?.nombre ?? "(sin nombre)"} ya tiene su enlace`,
    preheader: "El enlace se guardó y ya se le envió al cliente por correo.",
    texto: `La asesoría del ${etiqueta(cita.inicio)} (cita #${citaId}) ya tiene enlace y el cliente ya lo recibió por correo automáticamente.`,
    cta: { url: link, label: "Unirme a la asesoría en línea", icono: "calendario" as const },
  }).catch((e) => console.error("guardarLinkManual: no se pudo avisar al staff", e));
  return { ok: true };
}

/** Port fiel de crearCita: transacción con FOR UPDATE + UNIQUE como última defensa. */
async function crearCita(prospectoId: number, asesorId: number, inicio: Date, fin: Date, correo: string) {
  const prospecto = await prisma.prospectos.findUnique({ where: { id: prospectoId }, select: { id: true, etapa: true, nombre: true, telefono_whatsapp: true } });
  if (!prospecto) return { error: "Prospecto no encontrado", codigo: 404 } as const;
  try {
    const r = await prisma.$transaction(async (tx) => {
      const traslape = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM citas
        WHERE asesor_id = ${asesorId} AND estado IN ('agendada','confirmada')
          AND inicio < ${fin} AND fin > ${inicio}
        FOR UPDATE`;
      if (traslape.length) return { error: "El asesor ya tiene una cita en ese horario", codigo: 409 } as const;
      const cita = await tx.citas.create({ data: { prospecto_id: prospectoId, asesor_id: asesorId, inicio, fin } });
      if (prospecto.etapa === "prospecto" || prospecto.etapa === "calificado") {
        await tx.prospectos.update({ where: { id: prospectoId }, data: { etapa: "cita_agendada" } });
        await tx.bitacora_pipeline.create({
          data: { prospecto_id: prospectoId, etapa_anterior: prospecto.etapa, etapa_nueva: "cita_agendada", origen: "sistema", nota: `Cita #${cita.id} creada` },
        });
      }
      return { cita } as const;
    });
    if (!("error" in r)) await confirmarCitaPorCorreo(r.cita, correo, prospecto.nombre, prospecto.telefono_whatsapp);
    return r;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "P2002") return { error: "El asesor ya tiene una cita que inicia exactamente a esa hora", codigo: 409 } as const;
    throw e;
  }
}

/** Port fiel de agendar: valida, elige asesor de menor carga y reintenta en carrera.
 *  `correo` es obligatorio — ahí llega el enlace real de la videollamada. */
export async function agendar(prospectoId: number, inicioStr: string, correo: string, asesorId: number | null = null) {
  const inicio = paredDesde(inicioStr);
  if (!inicio || inicio.getTime() < ahoraPared().getTime()) return { error: "Horario inválido o en el pasado", codigo: 422 } as const;
  const correoLimpio = correo.trim().toLowerCase();
  if (!CORREO_RE.test(correoLimpio)) return { error: "Escribe un correo válido — ahí te llega el enlace de tu asesoría en línea", codigo: 422 } as const;
  const duracionMin = parseInt(await config("duracion_cita_minutos", "30"), 10);
  const fin = new Date(inicio.getTime() + duracionMin * 60_000);

  if (asesorId !== null) return crearCita(prospectoId, asesorId, inicio, fin, correoLimpio);

  const candidatos = await prisma.$queryRaw<{ id: number }[]>`
    SELECT u.id FROM usuarios u
    LEFT JOIN citas c ON c.asesor_id = u.id AND c.estado IN ('agendada','confirmada') AND c.inicio >= NOW()
    WHERE u.es_asesor = 1 AND u.activo = 1
    GROUP BY u.id ORDER BY COUNT(c.id) ASC, u.id ASC`;
  for (const cand of candidatos) {
    const r = await crearCita(prospectoId, Number(cand.id), inicio, fin, correoLimpio);
    if (!("error" in r) || r.codigo !== 409) return r;
  }
  return { error: "Ningún asesor tiene libre ese horario", codigo: 409 } as const;
}
export { etiqueta, isoDia };
