import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

/**
 * Sesión del panel: cookie httpOnly `inmath_panel` con `uid.exp.version.hmac`
 * firmada con APP_SECRET (sustituye a la sesión PHP; los hashes bcrypt de la
 * BD se comparten con el panel PHP durante el strangler).
 *
 * `version` es `usuarios.session_version` (M-11, auditoría 2026-09): se
 * incrementa al cambiar la contraseña o al resetear el acceso de alguien, lo
 * que invalida de golpe cualquier cookie emitida con la versión anterior, sin
 * esperar a que expire. Cookies emitidas ANTES de este cambio (formato viejo
 * `uid.exp.hmac`, sin version) se siguen aceptando con la firma vieja —
 * equivalen a session_version=1 (el default) — para no forzar un re-login
 * general de todo el staff al desplegar esto.
 */
const COOKIE = "inmath_panel";
const DURACION_S = 7 * 86400;

function secreto(): string {
  const s = process.env.APP_SECRET ?? "";
  if (!s) throw new Error("Falta APP_SECRET en .env");
  return s;
}
function firma(uid: number, exp: number, version: number): string {
  return createHmac("sha256", secreto()).update(`sesion:${uid}:${exp}:${version}`).digest("hex");
}
/** Firma del formato previo a M-11 (sin session_version) — solo para
 *  verificar cookies ya emitidas; nunca se usa para crear cookies nuevas. */
function firmaLegacy(uid: number, exp: number): string {
  return createHmac("sha256", secreto()).update(`sesion:${uid}:${exp}`).digest("hex");
}

/** Parsea y valida el formato de la cookie (nuevo de 4 partes, o el viejo de
 *  3 sin `version`). Regresa también el hmac ESPERADO para esa cookie. */
function partesCookie(valor: string): { uid: number; exp: number; version: number; hmac: string; esperado: string } | null {
  const partes = valor.split(".");
  if (partes.length === 4) {
    const [uidStr, expStr, versionStr, hmac] = partes;
    const uid = parseInt(uidStr, 10), exp = parseInt(expStr, 10), version = parseInt(versionStr, 10);
    if (!uid || !exp || !hmac || !Number.isInteger(version) || version < 0) return null;
    return { uid, exp, version, hmac, esperado: firma(uid, exp, version) };
  }
  if (partes.length === 3) {
    const [uidStr, expStr, hmac] = partes;
    const uid = parseInt(uidStr, 10), exp = parseInt(expStr, 10);
    if (!uid || !exp || !hmac) return null;
    return { uid, exp, version: 1, hmac, esperado: firmaLegacy(uid, exp) };
  }
  return null;
}

export async function crearSesion(usuarioId: number): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + DURACION_S;
  const u = await prisma.usuarios.findUnique({ where: { id: usuarioId }, select: { session_version: true } });
  const version = u?.session_version ?? 1;
  (await cookies()).set(COOKIE, `${usuarioId}.${exp}.${version}.${firma(usuarioId, exp, version)}`, {
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
  const partes = partesCookie(valor);
  if (!partes) return null;
  const { uid, exp, version, hmac, esperado: esperadoStr } = partes;
  if (exp < Date.now() / 1000) return null;
  const esperado = Buffer.from(esperadoStr);
  const dado = Buffer.from(hmac);
  if (dado.length !== esperado.length || !timingSafeEqual(esperado, dado)) return null;
  // session_version debe coincidir con el de la BD: si no, la sesión se
  // invalidó (cambio de contraseña o reset de acceso) aunque no haya
  // expirado — mismo trato que un usuario inactivo (M-11).
  const u = await prisma.usuarios.findFirst({
    where: { id: uid, activo: true, session_version: version },
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

/** Permiso por módulo. Desde el 03-sep-2026 aplica TAMBIÉN a administradores
 *  (decisión del cliente): los interruptores de /panel/usuarios mandan para
 *  todos; modulos NULL (usuarios legado) = todos. Candado anti-bloqueo: nadie
 *  puede editarse sus propios módulos (usuarioGuardarAccion los ignora). */
export function moduloPermitido(u: UsuarioPanel | null, modulo: string): boolean {
  if (!u) return false;
  if (u.modulos === null) return true;
  try {
    const lista = JSON.parse(u.modulos);
    return !Array.isArray(lista) || lista.includes(modulo);
  } catch { return true; }
}

/** Chequeo EXPLÍCITO de un módulo sensible (hoy: "calendario_respaldo"):
 *  a diferencia de moduloPermitido, aquí ser admin NO da pase automático —
 *  el permiso se otorga interruptor por interruptor en /panel/usuarios.
 *  modulos NULL (usuarios legado, "todos") sí lo concede. */
export function moduloExplicito(u: UsuarioPanel | null, modulo: string): boolean {
  return moduloPermitido(u, modulo);
}

export async function requiereModulo(modulo: string): Promise<UsuarioPanel> {
  const u = await requiereSesion();
  if (!moduloPermitido(u, modulo)) redirect("/panel/configuracion");
  return u;
}
