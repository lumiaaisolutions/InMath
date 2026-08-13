/**
 * CONVENCIÓN DE FECHAS: la BD guarda DATETIME en hora local de México (así lo
 * hace el PHP). Prisma trata DATETIME como UTC, así que aquí TODAS las fechas
 * de agenda se manejan como "hora de pared etiquetada UTC": se construyen con
 * Date.UTC(...) y se leen con getUTC*() — así lo que se escribe y compara en
 * BD coincide 1:1 con el sistema PHP durante la migración.
 */
const DIAS = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const MESES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const TZ = "America/Mexico_City";

/** Ahora, como hora de pared de México etiquetada UTC. */
export function ahoraPared(): Date {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
    .formatToParts(new Date()).reduce<Record<string, string>>((a, x) => ((a[x.type] = x.value), a), {});
  return new Date(Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second));
}
/** "YYYY-MM-DD HH:MM[:SS]" → Date pared-UTC (null si inválida). */
export function paredDesde(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0)));
}
export const isoDia = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
export const isoMinuto = (d: Date) => `${isoDia(d)} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
export const diaSemanaN = (d: Date) => (d.getUTCDay() === 0 ? 7 : d.getUTCDay());
export function etiqueta(d: Date): string {
  const dia = DIAS[diaSemanaN(d)];
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${d.getUTCDate()} de ${MESES[d.getUTCMonth() + 1]}, ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}
