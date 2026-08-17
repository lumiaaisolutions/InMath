import { prisma, config } from "./db";
import { etiqueta, isoMinuto, diaSemanaN, isoDia, ahoraPared, paredDesde } from "./fechas";
import { lunesDe, lunesEnRango, overridesDe } from "./disponibilidad";

export type Slot = { inicio: string; fin: string; etiqueta: string; asesores_libres: number[] };

/** Port fiel de AgendaServicio::slotsDisponibles (misma semántica y límites). */
export async function slotsDisponibles(desde: Date | null = null, dias = 7, asesorId: number | null = null, max = 30): Promise<Slot[]> {
  const horario = JSON.parse(await config("horario_atencion", '{"dias":[1,2,3,4,5],"inicio":"09:00","fin":"19:00"}'));
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
    // Horas puntuales del día: las del override si existe; si no, el rango
    // base expandido cada duracionMin (comportamiento histórico).
    let horasDia: Date[];
    if (ov) {
      const dd = ov.dias[String(dow)];
      if (!dd || !dd.on || !dd.horas.length) continue;
      horasDia = dd.horas.map((hhmm) => {
        const [h, m] = hhmm.split(":").map(Number);
        const t = new Date(dia); t.setUTCHours(h, m, 0, 0);
        return t;
      });
    } else {
      if (!(horario.dias ?? [1, 2, 3, 4, 5]).includes(dow)) continue;
      const [hi, mi] = String(horario.inicio ?? "09:00").split(":").map(Number);
      const [hf, mf] = String(horario.fin ?? "19:00").split(":").map(Number);
      const cierre = new Date(dia); cierre.setUTCHours(hf, mf, 0, 0);
      horasDia = [];
      // OJO: no usar `for (let t = new Date(dia), _ = t.setUTCHours(...))` — el
      // minificador de Turbopack lo compila mal (llama setUTCHours sobre otra var).
      const apertura = new Date(dia); apertura.setUTCHours(hi, mi, 0, 0);
      for (let t = apertura; t.getTime() + duracionMin * 60_000 <= cierre.getTime(); t = new Date(t.getTime() + duracionMin * 60_000)) {
        horasDia.push(new Date(t));
      }
    }
    for (const t of horasDia) {
      if (slots.length >= max) break;
      if (t.getTime() < minimo) continue;
      const fin = new Date(t.getTime() + duracionMin * 60_000);
      const libres = asesores.filter((a) =>
        !ocupadas.some((c) => c.asesor_id === a && c.inicio < fin && c.fin > t)
      );
      if (libres.length) slots.push({ inicio: isoMinuto(t), fin: isoMinuto(fin), etiqueta: etiqueta(t), asesores_libres: libres });
    }
  }
  return slots;
}

/** Port fiel de crearCita: transacción con FOR UPDATE + UNIQUE como última defensa. */
async function crearCita(prospectoId: number, asesorId: number, inicio: Date, fin: Date) {
  const prospecto = await prisma.prospectos.findUnique({ where: { id: prospectoId }, select: { id: true, etapa: true } });
  if (!prospecto) return { error: "Prospecto no encontrado", codigo: 404 } as const;
  try {
    return await prisma.$transaction(async (tx) => {
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
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "P2002") return { error: "El asesor ya tiene una cita que inicia exactamente a esa hora", codigo: 409 } as const;
    throw e;
  }
}

/** Port fiel de agendar: valida, elige asesor de menor carga y reintenta en carrera. */
export async function agendar(prospectoId: number, inicioStr: string, asesorId: number | null = null) {
  const inicio = paredDesde(inicioStr);
  if (!inicio || inicio.getTime() < ahoraPared().getTime()) return { error: "Horario inválido o en el pasado", codigo: 422 } as const;
  const duracionMin = parseInt(await config("duracion_cita_minutos", "30"), 10);
  const fin = new Date(inicio.getTime() + duracionMin * 60_000);

  if (asesorId !== null) return crearCita(prospectoId, asesorId, inicio, fin);

  const candidatos = await prisma.$queryRaw<{ id: number }[]>`
    SELECT u.id FROM usuarios u
    LEFT JOIN citas c ON c.asesor_id = u.id AND c.estado IN ('agendada','confirmada') AND c.inicio >= NOW()
    WHERE u.es_asesor = 1 AND u.activo = 1
    GROUP BY u.id ORDER BY COUNT(c.id) ASC, u.id ASC`;
  for (const cand of candidatos) {
    const r = await crearCita(prospectoId, Number(cand.id), inicio, fin);
    if (!("error" in r) || r.codigo !== 409) return r;
  }
  return { error: "Ningún asesor tiene libre ese horario", codigo: 409 } as const;
}
export { etiqueta, isoDia };
