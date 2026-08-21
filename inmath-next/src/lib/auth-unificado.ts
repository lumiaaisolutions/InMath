import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

/**
 * Login ÚNICO para staff (usuarios del panel) y alumnos (portal). Un mismo
 * formulario resuelve quién es y a dónde va:
 *  - staff → sesión de panel, redirige a /panel (sin gate de pago).
 *  - alumno → sesión de portal, redirige a /portal (validado por el pago).
 */
export type LoginResuelto =
  | { tipo: "staff"; id: number }
  | { tipo: "alumno"; id: number }
  | { tipo: "error"; motivo: "credenciales" | "sin-pago" | "inactivo" };

/** Login con identificador (correo del staff, o usuario/correo del alumno) + contraseña. */
export async function resolverLoginPassword(identificador: string, password: string): Promise<LoginResuelto> {
  const id = identificador.trim();
  if (!id || !password) return { tipo: "error", motivo: "credenciales" };
  const idLower = id.toLowerCase();

  // 1) Staff por correo (sin gate de pago).
  const staff = await prisma.usuarios.findFirst({ where: { email: idLower, activo: true } });
  if (staff && (await bcrypt.compare(password, staff.password_hash))) {
    return { tipo: "staff", id: staff.id };
  }

  // 2) Alumno por usuario (WhatsApp) o por correo. El login SÍ se permite aunque
  //    no haya pagado (registro paso a paso); el portal lo bloquea hasta pagar.
  const alumno = await prisma.alumnos.findFirst({
    where: { OR: [{ usuario: id }, { email: idLower }] },
    select: { id: true, password_hash: true, estado: true, prospecto_id: true },
  });
  if (alumno?.password_hash && (await bcrypt.compare(password, alumno.password_hash))) {
    if (alumno.estado !== "activo") return { tipo: "error", motivo: "inactivo" };
    return { tipo: "alumno", id: alumno.id };
  }

  return { tipo: "error", motivo: "credenciales" };
}

/** Login por correo (Google) — sin contraseña; staff primero, luego alumno con gate de pago. */
export async function resolverLoginEmail(email: string): Promise<LoginResuelto> {
  const idLower = email.trim().toLowerCase();
  if (!idLower) return { tipo: "error", motivo: "credenciales" };

  const staff = await prisma.usuarios.findFirst({ where: { email: idLower, activo: true } });
  if (staff) return { tipo: "staff", id: staff.id };

  const alumno = await prisma.alumnos.findFirst({
    where: { email: idLower },
    select: { id: true, estado: true, prospecto_id: true },
  });
  if (!alumno) return { tipo: "error", motivo: "credenciales" };
  if (alumno.estado !== "activo") return { tipo: "error", motivo: "inactivo" };
  return { tipo: "alumno", id: alumno.id };
}
