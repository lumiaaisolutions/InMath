import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { prisma, config } from "@/lib/db";
import { enviarCorreo } from "@/lib/correo";

/**
 * 2FA opcional del alumno: código de 6 dígitos por correo al iniciar sesión.
 * Sin migración: el flag por alumno vive en config `alumno_2fa` (JSON de ids) y
 * los códigos (hasheados, con caducidad) en `alumno_2fa_codes`.
 */
const CLAVE_FLAG = "alumno_2fa";
const CLAVE_COD = "alumno_2fa_codes";
const VIGENCIA_MS = 10 * 60_000;

function secreto(): string {
  const s = process.env.APP_SECRET ?? "";
  if (!s) throw new Error("Falta APP_SECRET");
  return s;
}

async function leerJson<T>(clave: string): Promise<T> {
  try { return JSON.parse(await config(clave, "{}")) as T; } catch { return {} as T; }
}
async function guardarJson(clave: string, valor: unknown) {
  await prisma.configuraciones.upsert({
    where: { clave },
    update: { valor: JSON.stringify(valor) },
    create: { clave, valor: JSON.stringify(valor), tipo: "json", descripcion: "2FA de alumnos" },
  });
}

export async function dosFactoresActivo(alumnoId: number): Promise<boolean> {
  const m = await leerJson<Record<string, boolean>>(CLAVE_FLAG);
  return m[String(alumnoId)] === true;
}

export async function activarDosFactores(alumnoId: number, on: boolean): Promise<void> {
  const m = await leerJson<Record<string, boolean>>(CLAVE_FLAG);
  if (on) m[String(alumnoId)] = true; else delete m[String(alumnoId)];
  await guardarJson(CLAVE_FLAG, m);
}

const hashCod = (c: string) => createHash("sha256").update(`${secreto()}:${c}`).digest("hex");

/** Genera y envía por correo un código de 6 dígitos al alumno. Devuelve true si se envió. */
export async function emitirCodigo2fa(alumnoId: number): Promise<boolean> {
  const alumno = await prisma.alumnos.findUnique({ where: { id: alumnoId }, select: { email: true, nombre: true } });
  if (!alumno?.email) return false;
  const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codes = await leerJson<Record<string, { h: string; exp: number }>>(CLAVE_COD);
  const ahora = Date.now();
  for (const k of Object.keys(codes)) if (codes[k].exp < ahora) delete codes[k];
  codes[String(alumnoId)] = { h: hashCod(codigo), exp: ahora + VIGENCIA_MS };
  await guardarJson(CLAVE_COD, codes);
  await enviarCorreo({
    para: [alumno.email],
    asunto: "Tu código para entrar — Portal InMath",
    preheader: `Tu código de acceso es ${codigo} (vence en 10 minutos).`,
    texto: `Hola ${alumno.nombre},\n\nUsa este código para completar tu inicio de sesión en el portal. Escríbelo en la pantalla "Verifica que eres tú".`,
    codigo,
    nota: "El código vence en 10 minutos. Si tú no intentaste entrar, ignora este correo y tu cuenta seguirá protegida.",
  });
  return true;
}

/** Verifica el código y lo consume. */
export async function verificarCodigo2fa(alumnoId: number, codigo: string): Promise<boolean> {
  const codes = await leerJson<Record<string, { h: string; exp: number }>>(CLAVE_COD);
  const e = codes[String(alumnoId)];
  if (!e || e.exp < Date.now()) return false;
  const dado = Buffer.from(hashCod(codigo.trim()));
  const esperado = Buffer.from(e.h);
  if (dado.length !== esperado.length || !timingSafeEqual(dado, esperado)) return false;
  delete codes[String(alumnoId)];
  await guardarJson(CLAVE_COD, codes);
  return true;
}

/** Token firmado (corto) que lleva el alumnoId entre el paso 1 y 2 del login. */
export function tokenReto(alumnoId: number): string {
  const exp = Math.floor(Date.now() / 1000) + 600;
  const h = createHmac("sha256", secreto()).update(`2fa:${alumnoId}:${exp}`).digest("hex");
  return `${alumnoId}.${exp}.${h}`;
}
export function alumnoDeReto(token: string): number | null {
  const [aid, exp, h] = (token ?? "").split(".");
  const id = parseInt(aid, 10), e = parseInt(exp, 10);
  if (!id || !e || !h || e < Date.now() / 1000) return null;
  const esperado = Buffer.from(createHmac("sha256", secreto()).update(`2fa:${id}:${e}`).digest("hex"));
  const dado = Buffer.from(h);
  if (dado.length !== esperado.length || !timingSafeEqual(esperado, dado)) return null;
  return id;
}
