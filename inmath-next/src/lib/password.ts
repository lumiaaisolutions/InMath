/**
 * Reglas de seguridad de contraseña, compartidas por el cliente (wizard, live
 * checklist) y el servidor (validación al registrar). Una sola fuente de verdad.
 */
export type ReglaPassword = { clave: string; etiqueta: string; ok: (p: string) => boolean };

export const REGLAS_PASSWORD: ReglaPassword[] = [
  { clave: "largo", etiqueta: "Al menos 8 caracteres", ok: (p) => p.length >= 8 },
  { clave: "mayus", etiqueta: "Una letra mayúscula (A-Z)", ok: (p) => /[A-Z]/.test(p) },
  { clave: "minus", etiqueta: "Una letra minúscula (a-z)", ok: (p) => /[a-z]/.test(p) },
  { clave: "numero", etiqueta: "Un número (0-9)", ok: (p) => /\d/.test(p) },
];

/** Devuelve qué reglas cumple la contraseña (para el checklist en vivo). */
export function evaluaPassword(p: string): Record<string, boolean> {
  return Object.fromEntries(REGLAS_PASSWORD.map((r) => [r.clave, r.ok(p)]));
}

/** True si cumple TODAS las reglas de seguridad. */
export function passwordSegura(p: string): boolean {
  return REGLAS_PASSWORD.every((r) => r.ok(p));
}

/** Nivel 0-4 para la barra de fuerza (cuántas reglas cumple + bonus por longitud). */
export function fuerzaPassword(p: string): number {
  if (!p) return 0;
  let n = REGLAS_PASSWORD.filter((r) => r.ok(p)).length;
  if (p.length >= 12 && /[^A-Za-z0-9]/.test(p)) n = Math.min(4, n + 1);
  return Math.min(4, n);
}
