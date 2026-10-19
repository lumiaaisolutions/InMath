import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Cifrado simétrico AES-256-GCM para secretos que hoy viven en BD en texto
 * plano (M-13, auditoría 2026-09 — ver docs/auditoria-ciberseguridad-2026-09.md).
 * Hoy solo lo usa el refresh token de Google Calendar
 * (configuraciones.google_calendar_refresh, ver src/lib/google-calendar.ts),
 * pero queda genérico para reusarse si más adelante se cifran otros campos.
 *
 * Mismo patrón que APP_SECRET/API_KEY (ver src/lib/panel/sesion.ts): la clave
 * sale de una variable de entorno nueva, ENCRYPTION_KEY — póngala en el .env
 * del VPS (nunca en el repo ni en el chat), idealmente 32+ bytes aleatorios
 * (p. ej. `openssl rand -base64 32`). Aquí se le aplica sha256 para obtener
 * siempre los 32 bytes exactos que pide AES-256-GCM, sin importar el
 * formato/longitud con que se haya generado la variable.
 *
 * Formato del texto cifrado: "enc:v1:<iv-b64>:<tag-b64>:<cifrado-b64>". El
 * prefijo "enc:v1:" deja a quien LEE distinguir un valor ya cifrado de uno
 * viejo en texto plano durante la transición — ver estaCifrado().
 */
const PREFIJO = "enc:v1:";

function clave(): Buffer {
  const s = process.env.ENCRYPTION_KEY ?? "";
  if (!s) throw new Error("Falta ENCRYPTION_KEY en .env");
  return createHash("sha256").update(s).digest();
}

/** true si el valor ya viene en el formato de cifrado de este módulo (vs. un
 *  valor viejo en texto plano, guardado antes de M-13). */
export function estaCifrado(texto: string): boolean {
  return texto.startsWith(PREFIJO);
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", clave(), iv);
  const cifrado = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIJO}${iv.toString("base64")}:${tag.toString("base64")}:${cifrado.toString("base64")}`;
}

export function descifrar(texto: string): string {
  if (!estaCifrado(texto)) throw new Error("Valor no está en formato cifrado (falta el prefijo enc:v1:)");
  const partes = texto.slice(PREFIJO.length).split(":");
  if (partes.length !== 3) throw new Error("Formato de valor cifrado inválido");
  const [ivB64, tagB64, dataB64] = partes;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const datos = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", clave(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(datos), decipher.final()]).toString("utf8");
}
