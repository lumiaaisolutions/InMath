import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { enviarCorreo } from "@/lib/correo";

/**
 * Restablecimiento de contraseña UNIFICADO (staff del panel + alumnos del
 * portal). Tokens de un solo uso con caducidad de 30 min, guardados HASHEADOS
 * en configuraciones.resets_password (JSON) — sin migración de BD. El correo
 * sale por el noreply configurado en SMTP_URL. Como el login es único
 * (/panel/login), la recuperación también: busca el correo primero en staff y
 * luego en alumnos.
 */
const CLAVE = "resets_password";
const VIGENCIA_MS = 30 * 60_000;

type Tipo = "staff" | "alumno";
type Entrada = { id: number; exp: number; tipo?: Tipo };
type Mapa = Record<string, Entrada>;
const hashDe = (token: string) => createHash("sha256").update(token).digest("hex");

async function leerMapa(): Promise<Mapa> {
  const fila = await prisma.configuraciones.findUnique({ where: { clave: CLAVE } });
  try {
    const j = JSON.parse(fila?.valor ?? "{}");
    const ahora = Date.now();
    return Object.fromEntries(Object.entries(j as Mapa).filter(([, v]) => v.exp > ahora));
  } catch { return {}; }
}

async function guardarMapa(mapa: Mapa) {
  await prisma.configuraciones.upsert({
    where: { clave: CLAVE },
    update: { valor: JSON.stringify(mapa) },
    create: { clave: CLAVE, valor: JSON.stringify(mapa), tipo: "json", descripcion: "Tokens de restablecimiento de contraseña (hasheados)" },
  });
}

async function emitirToken(id: number, tipo: Tipo): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const mapa = await leerMapa();
  mapa[hashDe(token)] = { id, exp: Date.now() + VIGENCIA_MS, tipo };
  await guardarMapa(mapa);
  return token;
}

/** Si el correo pertenece a un staff activo O a un alumno activo, le envía el
 *  enlace de reset. SIEMPRE silencioso hacia afuera (no revela si existe). */
export async function solicitarReset(email: string): Promise<void> {
  const correo = email.trim().toLowerCase();
  const base = process.env.APP_URL ?? "";

  const staff = await prisma.usuarios.findFirst({ where: { email: correo, activo: true } });
  if (staff) {
    const token = await emitirToken(staff.id, "staff");
    await enviarCorreo({
      para: [staff.email],
      asunto: "Restablece tu contraseña — Inmath CRM",
      texto: `Hola ${staff.nombre},\n\n`
        + `Recibimos una solicitud para restablecer tu contraseña del panel. `
        + `Para crear una nueva, entra a este enlace (vence en 30 minutos):\n\n`
        + `${base}/panel/login/restablecer?token=${token}\n\n`
        + `Si tú no lo pediste, puedes ignorar este correo — tu contraseña sigue igual.`,
    });
    return;
  }

  const alumno = await prisma.alumnos.findFirst({ where: { email: correo, estado: "activo" } });
  if (alumno) {
    const token = await emitirToken(alumno.id, "alumno");
    await enviarCorreo({
      para: [alumno.email!],
      asunto: "Restablece tu contraseña — Portal InMath",
      texto: `Hola ${alumno.nombre},\n\n`
        + `Recibimos una solicitud para restablecer la contraseña de tu portal de alumno. `
        + `Para crear una nueva, entra a este enlace (vence en 30 minutos):\n\n`
        + `${base}/panel/login/restablecer?token=${token}\n\n`
        + `Si tú no lo pediste, puedes ignorar este correo — tu contraseña sigue igual.`,
    });
    return;
  }
  // No existe: silencio (no se revela).
}

/** Valida un token vigente y regresa el id (staff o alumno), o null. */
export async function usuarioDeToken(token: string): Promise<number | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const mapa = await leerMapa();
  return mapa[hashDe(token)]?.id ?? null;
}

/** Cambia la contraseña (en la tabla correcta) si el token es vigente, y lo consume. */
export async function restablecerConToken(token: string, password: string): Promise<boolean> {
  const mapa = await leerMapa();
  const h = hashDe(token);
  const entrada = mapa[h];
  if (!entrada) return false;
  delete mapa[h];
  await guardarMapa(mapa);
  const hash = await bcrypt.hash(password, 10);
  if (entrada.tipo === "alumno") {
    await prisma.alumnos.update({ where: { id: entrada.id }, data: { password_hash: hash } });
  } else {
    // legacy sin tipo = staff
    await prisma.usuarios.update({ where: { id: entrada.id }, data: { password_hash: hash } });
  }
  return true;
}
