import { prisma, config } from "./db";
import { isoDia, diaSemanaN } from "./fechas";

/** Franja de un día: activo + rango de atención. */
export type DiaFranja = { on: boolean; inicio: string; fin: string };
export type SemanaDisp = { dias: Record<string, DiaFranja> };

export const DOW = ["1", "2", "3", "4", "5", "6", "7"];

/** Lunes (00:00 pared-UTC) de la semana que contiene a d. */
export function lunesDe(d: Date): Date {
  const base = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  return new Date(base.getTime() - (diaSemanaN(base) - 1) * 86400_000);
}
export const claveSemana = (lunesISO: string) => `disponibilidad_${lunesISO}`;

/** Horario recurrente base (el de "Configuración"). */
export async function horarioBase(): Promise<{ dias: number[]; inicio: string; fin: string }> {
  try {
    const h = JSON.parse(await config("horario_atencion", '{"dias":[1,2,3,4,5],"inicio":"09:00","fin":"19:00"}'));
    return { dias: h.dias ?? [1, 2, 3, 4, 5], inicio: h.inicio ?? "09:00", fin: h.fin ?? "19:00" };
  } catch {
    return { dias: [1, 2, 3, 4, 5], inicio: "09:00", fin: "19:00" };
  }
}

function normaliza(d: Record<string, Partial<DiaFranja>> = {}): Record<string, DiaFranja> {
  const out: Record<string, DiaFranja> = {};
  for (const k of DOW) {
    const x = d[k] ?? {};
    out[k] = { on: !!x.on, inicio: x.inicio ?? "09:00", fin: x.fin ?? "19:00" };
  }
  return out;
}

/** Override de una semana (o null si no se ha definido). */
export async function leerSemana(lunesISO: string): Promise<SemanaDisp | null> {
  const fila = await prisma.configuraciones.findUnique({ where: { clave: claveSemana(lunesISO) } });
  if (!fila) return null;
  try {
    const j = JSON.parse(fila.valor);
    return j?.dias ? { dias: normaliza(j.dias) } : null;
  } catch {
    return null;
  }
}

/** Datos para editar una semana: el override si existe; si no, derivado del base. */
export async function semanaParaEditar(lunesISO: string): Promise<{ dias: Record<string, DiaFranja>; definida: boolean }> {
  const ov = await leerSemana(lunesISO);
  if (ov) return { dias: ov.dias, definida: true };
  const base = await horarioBase();
  const dias: Record<string, DiaFranja> = {};
  for (const k of DOW) dias[k] = { on: base.dias.includes(+k), inicio: base.inicio, fin: base.fin };
  return { dias, definida: false };
}

/** Overrides de varios lunes, indexados por lunes ISO (una sola consulta). */
export async function overridesDe(lunesISOs: string[]): Promise<Record<string, SemanaDisp>> {
  if (!lunesISOs.length) return {};
  const filas = await prisma.configuraciones.findMany({
    where: { clave: { in: lunesISOs.map(claveSemana) } },
  });
  const map: Record<string, SemanaDisp> = {};
  for (const f of filas) {
    try {
      const j = JSON.parse(f.valor);
      if (j?.dias) map[f.clave.replace("disponibilidad_", "")] = { dias: normaliza(j.dias) };
    } catch { /* valor corrupto → se ignora, cae al base */ }
  }
  return map;
}

/** ISO de los lunes distintos que cubren un rango [inicio, fin). */
export function lunesEnRango(inicio: Date, fin: Date): string[] {
  const out: string[] = [];
  let l = lunesDe(inicio);
  while (l.getTime() < fin.getTime()) {
    out.push(isoDia(l));
    l = new Date(l.getTime() + 7 * 86400_000);
  }
  return out;
}
