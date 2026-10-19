import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

/**
 * Sesión del PORTAL DEL ALUMNO — separada de la del panel (`inmath_panel`).
 * Cookie httpOnly `inmath_alumno` con `aid.exp.version.hmac` firmada con
 * APP_SECRET. El acceso está validado por el pago: solo existe
 * usuario/password_hash en `alumnos` después de un pago confirmado (ver
 * provisionarAccesoAlumno), y aquí re-verificamos que el alumno siga
 * `activo`.
 *
 * `version` es `alumnos.session_version` (M-11, auditoría 2026-09): se
 * incrementa al cambiar la contraseña o al resetear el acceso, lo que
 * invalida de golpe cualquier cookie emitida con la versión anterior, sin
 * esperar a que expire. Cookies emitidas ANTES de este cambio (formato viejo
 * `aid.exp.hmac`, sin version) se siguen aceptando con la firma vieja —
 * equivalen a session_version=1 (el default) — para no forzar un re-login
 * general de todos los alumnos al desplegar esto.
 */
const COOKIE = "inmath_alumno";
// Bajado de 30 a 14 días (plan de la auditoría, Ola 2 / M-11): menos tiempo
// de vida útil si una cookie se roba.
const DURACION_S = 14 * 86400;

function secreto(): string {
  const s = process.env.APP_SECRET ?? "";
  if (!s) throw new Error("Falta APP_SECRET en .env");
  return s;
}
function firma(aid: number, exp: number, version: number): string {
  return createHmac("sha256", secreto()).update(`alumno:${aid}:${exp}:${version}`).digest("hex");
}
/** Firma del formato previo a M-11 (sin session_version) — solo para
 *  verificar cookies ya emitidas; nunca se usa para crear cookies nuevas. */
function firmaLegacy(aid: number, exp: number): string {
  return createHmac("sha256", secreto()).update(`alumno:${aid}:${exp}`).digest("hex");
}

/** Parsea y valida el formato de la cookie (nuevo de 4 partes, o el viejo de
 *  3 sin `version`). Regresa también el hmac ESPERADO para esa cookie. */
function partesCookie(valor: string): { aid: number; exp: number; version: number; hmac: string; esperado: string } | null {
  const partes = valor.split(".");
  if (partes.length === 4) {
    const [aidStr, expStr, versionStr, hmac] = partes;
    const aid = parseInt(aidStr, 10), exp = parseInt(expStr, 10), version = parseInt(versionStr, 10);
    if (!aid || !exp || !hmac || !Number.isInteger(version) || version < 0) return null;
    return { aid, exp, version, hmac, esperado: firma(aid, exp, version) };
  }
  if (partes.length === 3) {
    const [aidStr, expStr, hmac] = partes;
    const aid = parseInt(aidStr, 10), exp = parseInt(expStr, 10);
    if (!aid || !exp || !hmac) return null;
    return { aid, exp, version: 1, hmac, esperado: firmaLegacy(aid, exp) };
  }
  return null;
}

export async function crearSesionAlumno(alumnoId: number): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + DURACION_S;
  const a = await prisma.alumnos.findUnique({ where: { id: alumnoId }, select: { session_version: true } });
  const version = a?.session_version ?? 1;
  // path "/" para que la sesión sea legible también fuera de /portal (ej. la
  // página pública /pago cuando el alumno registrado va a "Completar mi pago").
  (await cookies()).set(COOKIE, `${alumnoId}.${exp}.${version}.${firma(alumnoId, exp, version)}`, {
    httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production",
  });
}

export async function cerrarSesionAlumno(): Promise<void> {
  // OJO: delete() guarda por NOMBRE — dos llamadas con el mismo nombre y
  // distinto path se sobrescriben entre sí (solo sale un Set-Cookie). La
  // cookie real vive en path "/", así que esa llamada va al final.
  (await cookies()).delete({ name: COOKIE, path: "/portal" }); // compat: sesiones antiguas
  (await cookies()).delete({ name: COOKIE, path: "/" });
}

export type AlumnoPortal = {
  id: number; nombre: string; telefono: string; email: string | null;
  usuario: string | null; curso_id: number; curso_nombre: string; prospecto_id: number;
  inscrito_en: Date; estado: string;
};

/** null si no hay cookie válida o el alumno ya no está activo. */
export async function alumnoActual(): Promise<AlumnoPortal | null> {
  const valor = (await cookies()).get(COOKIE)?.value;
  if (!valor) return null;
  const partes = partesCookie(valor);
  if (!partes) return null;
  const { aid, exp, version, hmac, esperado: esperadoStr } = partes;
  if (exp < Date.now() / 1000) return null;
  const esperado = Buffer.from(esperadoStr);
  const dado = Buffer.from(hmac);
  if (dado.length !== esperado.length || !timingSafeEqual(esperado, dado)) return null;
  // session_version debe coincidir con el de la BD: si no, la sesión se
  // invalidó (cambio de contraseña o reset de acceso) aunque no haya
  // expirado — mismo trato que un alumno ya no `activo` (M-11).
  const a = await prisma.alumnos.findFirst({
    where: { id: aid, estado: "activo", session_version: version },
    include: { cursos: { select: { nombre: true } } },
  });
  if (!a) return null;
  return {
    id: a.id, nombre: a.nombre, telefono: a.telefono, email: a.email,
    usuario: a.usuario, curso_id: a.curso_id, curso_nombre: a.cursos.nombre,
    prospecto_id: a.prospecto_id, inscrito_en: a.inscrito_en, estado: a.estado,
  };
}

export async function requiereAlumno(): Promise<AlumnoPortal> {
  const a = await alumnoActual();
  if (!a) redirect("/portal/login");
  return a;
}
