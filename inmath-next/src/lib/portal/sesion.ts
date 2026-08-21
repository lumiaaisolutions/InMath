import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

/**
 * Sesión del PORTAL DEL ALUMNO — separada de la del panel (`inmath_panel`).
 * Cookie httpOnly `inmath_alumno` con `aid.exp.hmac` firmada con APP_SECRET.
 * El acceso está validado por el pago: solo existe usuario/password_hash en
 * `alumnos` después de un pago confirmado (ver provisionarAccesoAlumno), y
 * aquí re-verificamos que el alumno siga `activo`.
 */
const COOKIE = "inmath_alumno";
const DURACION_S = 30 * 86400;

function secreto(): string {
  const s = process.env.APP_SECRET ?? "";
  if (!s) throw new Error("Falta APP_SECRET en .env");
  return s;
}
function firma(aid: number, exp: number): string {
  return createHmac("sha256", secreto()).update(`alumno:${aid}:${exp}`).digest("hex");
}

export async function crearSesionAlumno(alumnoId: number): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + DURACION_S;
  (await cookies()).set(COOKIE, `${alumnoId}.${exp}.${firma(alumnoId, exp)}`, {
    httpOnly: true, sameSite: "lax", path: "/portal", secure: process.env.NODE_ENV === "production",
  });
}

export async function cerrarSesionAlumno(): Promise<void> {
  (await cookies()).delete({ name: COOKIE, path: "/portal" });
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
  const [aidStr, expStr, hmac] = valor.split(".");
  const aid = parseInt(aidStr, 10), exp = parseInt(expStr, 10);
  if (!aid || !exp || !hmac || exp < Date.now() / 1000) return null;
  const esperado = Buffer.from(firma(aid, exp));
  const dado = Buffer.from(hmac);
  if (dado.length !== esperado.length || !timingSafeEqual(esperado, dado)) return null;
  const a = await prisma.alumnos.findFirst({
    where: { id: aid, estado: "activo" },
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
