/** Helpers de presentación del panel — port de panel/lib/ayuda.php. */

export const ETIQUETA_ETAPA: Record<string, string> = {
  prospecto: "Prospecto",
  calificado: "Calificado",
  cita_agendada: "Cita agendada",
  pago_pendiente: "Pago pendiente",
  inscrito: "Inscrito",
  descartado: "Descartado",
};
export const etiquetaEtapa = (e: string) => ETIQUETA_ETAPA[e] ?? e;

/** dd/mm HH:MM (la BD guarda hora de pared; se lee con getUTC*). */
export function fechaCorta(fecha: Date | string | null): string {
  if (fecha === null) return "—";
  const d = typeof fecha === "string" ? new Date(fecha.replace(" ", "T") + "Z") : fecha;
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function dinero(centavos: number, moneda = "MXN"): string {
  return `$${(centavos / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${moneda}`;
}
