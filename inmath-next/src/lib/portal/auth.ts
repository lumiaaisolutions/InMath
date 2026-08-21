import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

/**
 * El pago es el validador del acceso: un alumno solo puede entrar al portal si
 * tiene al menos un pago CONFIRMADO (`pagado`). Así no hay discrepancia — si el
 * pago no se realizó/confirmó, no hay login, aunque exista el registro.
 */
export async function tienePagoConfirmado(prospectoId: number): Promise<boolean> {
  const n = await prisma.pagos.count({ where: { prospecto_id: prospectoId, estado: "pagado" } });
  return n > 0;
}

type ResultadoAcceso =
  | { ok: true; alumnoId: number }
  | { ok: false; motivo: "credenciales" | "sin-pago" | "inactivo" };

/** Login por usuario (WhatsApp) + contraseña temporal/propia. */
export async function accesoPorCredenciales(usuario: string, password: string): Promise<ResultadoAcceso> {
  const alumno = await prisma.alumnos.findFirst({
    where: { usuario: usuario.trim() },
    select: { id: true, password_hash: true, estado: true, prospecto_id: true },
  });
  if (!alumno || !alumno.password_hash || !(await bcrypt.compare(password, alumno.password_hash))) {
    return { ok: false, motivo: "credenciales" };
  }
  if (alumno.estado !== "activo") return { ok: false, motivo: "inactivo" };
  if (!(await tienePagoConfirmado(alumno.prospecto_id))) return { ok: false, motivo: "sin-pago" };
  return { ok: true, alumnoId: alumno.id };
}

/** Login con Google: enlaza por correo con un alumno que ya pagó. */
export async function accesoPorEmail(email: string): Promise<ResultadoAcceso> {
  const correo = email.trim().toLowerCase();
  if (!correo) return { ok: false, motivo: "credenciales" };
  const alumno = await prisma.alumnos.findFirst({
    where: { email: correo },
    select: { id: true, estado: true, prospecto_id: true },
  });
  if (!alumno) return { ok: false, motivo: "credenciales" };
  if (alumno.estado !== "activo") return { ok: false, motivo: "inactivo" };
  if (!(await tienePagoConfirmado(alumno.prospecto_id))) return { ok: false, motivo: "sin-pago" };
  return { ok: true, alumnoId: alumno.id };
}

/** true si el login con Google está configurado (variables de entorno presentes). */
export function googleConfigurado(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
