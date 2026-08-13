import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

/**
 * Sesión del panel: cookie httpOnly `inmath_panel` con `uid.exp.hmac` firmada
 * con APP_SECRET (sustituye a la sesión PHP; los hashes bcrypt de la BD se
 * comparten con el panel PHP durante el strangler).
 */
const COOKIE = "inmath_panel";
const DURACION_S = 7 * 86400;

function secreto(): string {
  const s = process.env.APP_SECRET ?? "";
  if (!s) throw new Error("Falta APP_SECRET en .env");
  return s;
}
function firma(uid: number, exp: number): string {
  return createHmac("sha256", secreto()).update(`sesion:${uid}:${exp}`).digest("hex");
}

export async function crearSesion(usuarioId: number): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + DURACION_S;
  (await cookies()).set(COOKIE, `${usuarioId}.${exp}.${firma(usuarioId, exp)}`, {
    httpOnly: true, sameSite: "lax", path: "/panel", secure: process.env.NODE_ENV === "production",
  });
}

export async function cerrarSesion(): Promise<void> {
  (await cookies()).delete({ name: COOKIE, path: "/panel" });
}

export type UsuarioPanel = {
  id: number; nombre: string; email: string; rol: string; modulos: string | null; es_asesor: boolean; telefono: string | null;
};

/** Port de usuarioActual(): null si no hay cookie válida o el usuario ya no está activo. */
export async function usuarioActual(): Promise<UsuarioPanel | null> {
  const valor = (await cookies()).get(COOKIE)?.value;
  if (!valor) return null;
  const [uidStr, expStr, hmac] = valor.split(".");
  const uid = parseInt(uidStr, 10), exp = parseInt(expStr, 10);
  if (!uid || !exp || !hmac || exp < Date.now() / 1000) return null;
  const esperado = Buffer.from(firma(uid, exp));
  const dado = Buffer.from(hmac);
  if (dado.length !== esperado.length || !timingSafeEqual(esperado, dado)) return null;
  const u = await prisma.usuarios.findFirst({
    where: { id: uid, activo: true },
    select: { id: true, nombre: true, email: true, rol: true, modulos: true, es_asesor: true, telefono: true },
  });
  if (!u) return null;
  return { ...u, rol: u.rol as string, modulos: u.modulos === null ? null : JSON.stringify(u.modulos) };
}

export async function requiereSesion(): Promise<UsuarioPanel> {
  const u = await usuarioActual();
  if (!u) redirect("/panel/login");
  return u;
}

export async function requiereAdmin(): Promise<UsuarioPanel> {
  const u = await requiereSesion();
  if (u.rol !== "admin") redirect("/panel/perfil");
  return u;
}

/** Port de moduloPermitido: admin ve todo; modulos NULL = todos. */
export function moduloPermitido(u: UsuarioPanel | null, modulo: string): boolean {
  if (!u) return false;
  if (u.rol === "admin") return true;
  if (u.modulos === null) return true;
  try {
    const lista = JSON.parse(u.modulos);
    return !Array.isArray(lista) || lista.includes(modulo);
  } catch { return true; }
}

export async function requiereModulo(modulo: string): Promise<UsuarioPanel> {
  const u = await requiereSesion();
  if (!moduloPermitido(u, modulo)) redirect("/panel/perfil");
  return u;
}
