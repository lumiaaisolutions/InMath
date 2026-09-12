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

/** Zona horaria única del negocio (todos los asesores están en el Centro de
 *  México) — exportada para etiquetar la hora en la UI/correos y para que
 *  quien agenda desde otra zona (ej. Sonora) vea la conversión, en vez de
 *  asumir en silencio que su hora local coincide con la de México. */
export const TZ_NEGOCIO = TZ;
export const TZ_NEGOCIO_ETIQUETA = "Hora del Centro de México";
/** Offset fijo de CDMX: México abolió el horario de verano en la zona
 *  Centro desde 2022, así que es un offset constante todo el año — permite
 *  construir un instante real (con "Z") a partir de la hora de pared sin
 *  depender de ninguna librería de timezones. */
const TZ_NEGOCIO_OFFSET = "-06:00";

/** true si `zona` es un nombre de zona IANA válido para Intl (protege contra
 *  valores arbitrarios que llegan de un <input hidden> del cliente). */
export function zonaValida(zona: string | null | undefined): string | null {
  if (!zona) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zona });
    return zona;
  } catch {
    return null;
  }
}

/** Convierte una hora de pared de México (Date "pared-UTC", ver convención
 *  arriba) a la hora real que marca el reloj en `zona`. Devuelve null si la
 *  zona es inválida o si coincide con la de negocio (nada que convertir). */
export function horaEnZona(d: Date, zona: string | null | undefined): string | null {
  const z = zonaValida(zona);
  if (!z || z === TZ_NEGOCIO) return null;
  // Reconstruye el instante real: la hora de pared (campos UTC del Date)
  // SÍ es hora de México, así que se declara con su offset fijo.
  const real = new Date(`${isoMinuto(d).replace(" ", "T")}:00${TZ_NEGOCIO_OFFSET}`);
  return new Intl.DateTimeFormat("es-MX", { timeZone: z, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true }).format(real);
}

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
/** Texto de "cuándo" para el PROSPECTO: siempre aclara que es hora de México
 *  (nunca se asume que coincide con la hora local de quien lee). */
export const cuandoProspecto = (d: Date) => `${etiqueta(d)} (${TZ_NEGOCIO_ETIQUETA})`;
