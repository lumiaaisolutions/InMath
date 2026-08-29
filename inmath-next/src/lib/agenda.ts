import { prisma, config } from "./db";
import { etiqueta, isoMinuto, diaSemanaN, isoDia, ahoraPared, paredDesde } from "./fechas";
import { lunesDe, lunesEnRango, overridesDe } from "./disponibilidad";
import { enviarCorreo } from "./correo";

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

/** Manda la única confirmación de la cita: por correo, con el link de Meet si
 *  ya se generó (espera a n8n antes de mandarla), o con aviso de que llega
 *  en breve si no. */
async function confirmarCitaPorCorreo(cita: { id: number; asesor_id: number; inicio: Date; fin: Date }, correo: string, nombre: string | null) {
  const meetLink = await crearEventoCalendar(cita, nombre);
  if (meetLink) await prisma.citas.update({ where: { id: cita.id }, data: { meet_link: meetLink } });
  const cuando = etiqueta(cita.inicio);
  await enviarCorreo({
    para: [correo],
    asunto: "Tu asesoría está confirmada — Cursos InMath",
    preheader: meetLink ? "Aquí está el enlace de tu asesoría en línea." : "Tu cita quedó agendada, en breve te compartimos el enlace.",
    texto: meetLink
      ? `Hola ${nombre ?? ""},\n\nTu asesoría quedó agendada para el ${cuando}. Toca el botón para unirte a tu asesoría en línea en ese horario.`
      : `Hola ${nombre ?? ""},\n\nTu asesoría quedó agendada para el ${cuando}. En breve te compartimos el enlace de tu asesoría en línea — si no llega, un asesor te lo comparte antes de tu cita.`,
    ...(meetLink ? { cta: { url: meetLink, label: "Unirme a mi asesoría en línea" } } : {}),
  }).catch((e) => console.error("confirmarCitaPorCorreo: no se pudo enviar el correo", e));
}

/** Port fiel de crearCita: transacción con FOR UPDATE + UNIQUE como última defensa. */
async function crearCita(prospectoId: number, asesorId: number, inicio: Date, fin: Date, correo: string) {
  const prospecto = await prisma.prospectos.findUnique({ where: { id: prospectoId }, select: { id: true, etapa: true, nombre: true } });
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
    if (!("error" in r)) await confirmarCitaPorCorreo(r.cita, correo, prospecto.nombre);
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
