import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { enviarCorreo } from "@/lib/correo";

/**
 * Restablecimiento de contraseña del panel. Tokens de un solo uso con caducidad
 * de 30 min, guardados HASHEADOS en configuraciones.resets_password (JSON) —
 * sin migración de BD. El correo sale por el noreply configurado en SMTP_URL.
 */
const CLAVE = "resets_password";
const VIGENCIA_MS = 30 * 60_000;

type Mapa = Record<string, { id: number; exp: number }>;
const hashDe = (token: string) => createHash("sha256").update(token).digest("hex");

async function leerMapa(): Promise<Mapa> {
  const fila = await prisma.configuraciones.findUnique({ where: { clave: CLAVE } });
  try {
    const j = JSON.parse(fila?.valor ?? "{}");
    const ahora = Date.now();
    // poda de expirados
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

/** Si el correo pertenece a un usuario activo, le envía el enlace de reset.
 *  SIEMPRE silencioso hacia afuera (no revela si el correo existe). */
export async function solicitarReset(email: string): Promise<void> {
  const usuario = await prisma.usuarios.findFirst({ where: { email: email.trim().toLowerCase(), activo: true } });
  if (!usuario) return;
  const token = randomBytes(32).toString("hex");
  const mapa = await leerMapa();
  mapa[hashDe(token)] = { id: usuario.id, exp: Date.now() + VIGENCIA_MS };
  await guardarMapa(mapa);
  const base = process.env.APP_URL ?? "";
  await enviarCorreo({
    para: [usuario.email],
    asunto: "Restablece tu contraseña — Inmath CRM",
    texto: `Hola ${usuario.nombre},\n\n`
      + `Recibimos una solicitud para restablecer tu contraseña del panel. `
      + `Para crear una nueva, entra a este enlace (vence en 30 minutos):\n\n`
      + `${base}/panel/login/restablecer?token=${token}\n\n`
      + `Si tú no lo pediste, puedes ignorar este correo — tu contraseña sigue igual.`,
  });
}

/** Valida un token vigente y regresa el id del usuario, o null. */
export async function usuarioDeToken(token: string): Promise<number | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const mapa = await leerMapa();
  return mapa[hashDe(token)]?.id ?? null;
}

/** Cambia la contraseña si el token es vigente, y lo consume. */
export async function restablecerConToken(token: string, password: string): Promise<boolean> {
  const mapa = await leerMapa();
  const h = hashDe(token);
  const entrada = mapa[h];
  if (!entrada) return false;
  delete mapa[h];
  await guardarMapa(mapa);
  await prisma.usuarios.update({
    where: { id: entrada.id },
    data: { password_hash: await bcrypt.hash(password, 10) },
  });
  return true;
}
