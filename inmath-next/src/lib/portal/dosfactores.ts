import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { prisma, config } from "@/lib/db";
import { enviarCorreo } from "@/lib/correo";

/**
 * 2FA por código de 6 dígitos al correo, al iniciar sesión. Dos cuentas lo
 * usan con el MISMO mecanismo (hash del código en reposo, vigencia e
 * intentos limitados), generalizado por `TipoCuenta` en vez de duplicar la
 * lógica (Ola 3, ítem 16 de la auditoría):
 *  - "alumno": OPCIONAL, lo activa el alumno desde /portal/cuenta (flag
 *    `alumno_2fa`, JSON de ids).
 *  - "staff": OBLIGATORIO para TODO rol del panel (admin y asesor) — ambos
 *    ven datos de alumnos y pagos, así que no hay rol exento; sin flag de
 *    activación, siempre se pide. Sin "recordar este dispositivo": las
 *    sesiones de panel ya duran 7 días (ver panel/sesion.ts), así que el
 *    staff no vuelve a loguearse seguido — no vale la complejidad/riesgo
 *    extra de otra cookie firmada para ahorrarle un código cada semana.
 *
 * Sin migración: cada tipo guarda sus códigos (hasheados, con caducidad) en
 * su propia clave de `configuraciones` (JSON) — igual que el flag opcional
 * del alumno, sin tocar el schema.
 */
export type TipoCuenta = "alumno" | "staff";

const CLAVE_FLAG = "alumno_2fa";
const CLAVE_COD = "alumno_2fa_codes";
const CLAVE_COD_STAFF = "staff_2fa_codes";
const VIGENCIA_MS = 10 * 60_000;

function claveCodigos(tipo: TipoCuenta): string {
  return tipo === "staff" ? CLAVE_COD_STAFF : CLAVE_COD;
}

/** Datos de contacto de la cuenta (alumno o staff) para enviarle el código. */
async function datosCuenta(tipo: TipoCuenta, id: number): Promise<{ email: string; nombre: string } | null> {
  if (tipo === "staff") {
    const u = await prisma.usuarios.findUnique({ where: { id }, select: { email: true, nombre: true } });
    return u?.email ? { email: u.email, nombre: u.nombre } : null;
  }
  const a = await prisma.alumnos.findUnique({ where: { id }, select: { email: true, nombre: true } });
  return a?.email ? { email: a.email, nombre: a.nombre } : null;
}

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

/** Copia del correo del código, según el tipo de cuenta. */
function textosCodigo(tipo: TipoCuenta, nombre: string, codigo: string) {
  if (tipo === "staff") {
    return {
      asunto: "Tu código de acceso — Panel Inmath",
      preheader: `Tu código de acceso es ${codigo} (vence en 10 minutos).`,
      texto: `Hola ${nombre},\n\nUsa este código para completar tu inicio de sesión en el panel. Escríbelo en la pantalla "Verifica que eres tú".`,
      nota: "El código vence en 10 minutos. Si tú no intentaste entrar, ignora este correo y escríbenos — tu cuenta de staff tiene acceso a datos de alumnos y pagos.",
    };
  }
  return {
    asunto: "Tu código para entrar — Portal InMath",
    preheader: `Tu código de acceso es ${codigo} (vence en 10 minutos).`,
    texto: `Hola ${nombre},\n\nUsa este código para completar tu inicio de sesión en el portal. Escríbelo en la pantalla "Verifica que eres tú".`,
    nota: "El código vence en 10 minutos. Si tú no intentaste entrar, ignora este correo y tu cuenta seguirá protegida.",
  };
}

/** Genera y envía por correo un código de 6 dígitos. Devuelve true si se envió. */
async function emitirCodigoGenerico(tipo: TipoCuenta, id: number): Promise<boolean> {
  const cuenta = await datosCuenta(tipo, id);
  if (!cuenta) return false;
  const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const clave = claveCodigos(tipo);
  const codes = await leerJson<Record<string, { h: string; exp: number; n?: number }>>(clave);
  const ahora = Date.now();
  for (const k of Object.keys(codes)) if (codes[k].exp < ahora) delete codes[k];
  codes[String(id)] = { h: hashCod(codigo), exp: ahora + VIGENCIA_MS, n: 0 };
  await guardarJson(clave, codes);
  const t = textosCodigo(tipo, cuenta.nombre, codigo);
  await enviarCorreo({ para: [cuenta.email], asunto: t.asunto, preheader: t.preheader, texto: t.texto, codigo, nota: t.nota });
  return true;
}

/** Genera y envía por correo un código de 6 dígitos al alumno. Devuelve true si se envió. */
export async function emitirCodigo2fa(alumnoId: number): Promise<boolean> {
  return emitirCodigoGenerico("alumno", alumnoId);
}

/** Genera y envía por correo un código de 6 dígitos a un usuario del panel (staff). */
export async function emitirCodigo2faStaff(usuarioId: number): Promise<boolean> {
  return emitirCodigoGenerico("staff", usuarioId);
}

/** Nº máximo de intentos fallidos por código antes de invalidarlo (anti fuerza
 *  bruta del OTP de 6 dígitos: obliga a re-emitir el código). */
const MAX_INTENTOS_2FA = 5;

/** Verifica el código y lo consume. Limita los intentos fallidos por código. */
async function verificarCodigoGenerico(tipo: TipoCuenta, id: number, codigo: string): Promise<boolean> {
  const clave = claveCodigos(tipo);
  const codes = await leerJson<Record<string, { h: string; exp: number; n?: number }>>(clave);
  const e = codes[String(id)];
  if (!e || e.exp < Date.now()) return false;

  const dado = Buffer.from(hashCod(codigo.trim()));
  const esperado = Buffer.from(e.h);
  const ok = dado.length === esperado.length && timingSafeEqual(dado, esperado);

  if (!ok) {
    // Cuenta el intento fallido; al llegar al máximo, invalida el código.
    e.n = (e.n ?? 0) + 1;
    if (e.n >= MAX_INTENTOS_2FA) delete codes[String(id)];
    await guardarJson(clave, codes);
    return false;
  }

  delete codes[String(id)];
  await guardarJson(clave, codes);
  return true;
}

export async function verificarCodigo2fa(alumnoId: number, codigo: string): Promise<boolean> {
  return verificarCodigoGenerico("alumno", alumnoId, codigo);
}

export async function verificarCodigo2faStaff(usuarioId: number, codigo: string): Promise<boolean> {
  return verificarCodigoGenerico("staff", usuarioId, codigo);
}

/** Token firmado (corto) que lleva el tipo de cuenta + id entre el paso 1 y 2
 *  del login. El tipo va DENTRO de la firma (namespace del HMAC) y en claro
 *  en el token, para que el verificador sepa sin adivinar si valida contra
 *  `alumnos` o `usuarios` — evita que un reto de alumno sirva para el staff
 *  (o viceversa) aunque compartan el mismo id numérico. */
function tokenRetoGenerico(tipo: TipoCuenta, id: number): string {
  const exp = Math.floor(Date.now() / 1000) + 600;
  const h = createHmac("sha256", secreto()).update(`2fa:${tipo}:${id}:${exp}`).digest("hex");
  return `${tipo}.${id}.${exp}.${h}`;
}

/** Valida el reto firmado y regresa su tipo + id (o null si vencido/alterado). */
export function cuentaDeReto(token: string): { tipo: TipoCuenta; id: number } | null {
  const partes = (token ?? "").split(".");
  if (partes.length !== 4) return null;
  const [tipo, idStr, expStr, h] = partes;
  if (tipo !== "alumno" && tipo !== "staff") return null;
  const id = parseInt(idStr, 10), e = parseInt(expStr, 10);
  if (!id || !e || !h || e < Date.now() / 1000) return null;
  const esperado = Buffer.from(createHmac("sha256", secreto()).update(`2fa:${tipo}:${id}:${e}`).digest("hex"));
  const dado = Buffer.from(h);
  if (dado.length !== esperado.length || !timingSafeEqual(esperado, dado)) return null;
  return { tipo, id };
}

export function tokenReto(alumnoId: number): string {
  return tokenRetoGenerico("alumno", alumnoId);
}
export function tokenRetoStaff(usuarioId: number): string {
  return tokenRetoGenerico("staff", usuarioId);
}
/** Compat: solo regresa el id si el reto es de un ALUMNO (ignora uno de staff). */
export function alumnoDeReto(token: string): number | null {
  const c = cuentaDeReto(token);
  return c?.tipo === "alumno" ? c.id : null;
}

/* ── Código por correo para CAMBIAR/CREAR contraseña (mismo mecanismo que
 *    el 2FA: hash del código en reposo, vigencia e intentos limitados) ── */
const CLAVE_COD_PASS = "alumno_pass_cod";

export async function emitirCodigoPassword(alumnoId: number): Promise<boolean> {
  const alumno = await prisma.alumnos.findUnique({ where: { id: alumnoId }, select: { email: true, nombre: true } });
  if (!alumno?.email) return false;
  const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codes = await leerJson<Record<string, { h: string; exp: number; n?: number }>>(CLAVE_COD_PASS);
  const ahora = Date.now();
  for (const k of Object.keys(codes)) if (codes[k].exp < ahora) delete codes[k];
  codes[String(alumnoId)] = { h: hashCod(codigo), exp: ahora + VIGENCIA_MS, n: 0 };
  await guardarJson(CLAVE_COD_PASS, codes);
  await enviarCorreo({
    para: [alumno.email],
    asunto: "Confirma el cambio de tu contraseña — Portal InMath",
    preheader: `Tu código de confirmación es ${codigo} (vence en 10 minutos).`,
    texto: `Hola ${alumno.nombre},\n\nRecibimos una solicitud para cambiar la contraseña de tu cuenta. Escribe este código en tu portal para confirmarla. Si no fuiste tú, ignora este correo — tu contraseña no cambia sin el código.`,
    codigo,
  });
  return true;
}

export async function verificarCodigoPassword(alumnoId: number, codigo: string): Promise<boolean> {
  const codes = await leerJson<Record<string, { h: string; exp: number; n?: number }>>(CLAVE_COD_PASS);
  const e = codes[String(alumnoId)];
  if (!e || e.exp < Date.now()) return false;
  const dado = Buffer.from(hashCod(codigo.trim()));
  const esperado = Buffer.from(e.h);
  const ok = dado.length === esperado.length && timingSafeEqual(dado, esperado);
  if (!ok) {
    e.n = (e.n ?? 0) + 1;
    if (e.n >= MAX_INTENTOS_2FA) delete codes[String(alumnoId)];
    await guardarJson(CLAVE_COD_PASS, codes);
    return false;
  }
  delete codes[String(alumnoId)];
  await guardarJson(CLAVE_COD_PASS, codes);
  return true;
}
