"use server";
import { redirect } from "next/navigation";
import { resolverLoginPassword } from "@/lib/auth-unificado";
import { crearSesion } from "@/lib/panel/sesion";
import { crearSesionAlumno } from "@/lib/portal/sesion";
import {
  dosFactoresActivo, emitirCodigo2fa, verificarCodigo2fa, tokenReto,
  emitirCodigo2faStaff, verificarCodigo2faStaff, tokenRetoStaff, cuentaDeReto,
} from "@/lib/portal/dosfactores";
import { loginBloqueado, registrarFalloLogin, limpiarFallosLogin } from "@/lib/rate-limit";

export type EstadoLogin = { error?: string; reto2fa?: string };

export async function loginAccion(_prev: EstadoLogin, fd: FormData): Promise<EstadoLogin> {
  const identificador = String(fd.get("identificador") ?? fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!identificador || !password) return { error: "Escribe tu correo o usuario y tu contraseña." };

  // Freno de fuerza bruta PERSISTENTE (BD): sobrevive reinicios y multi-proceso.
  const clave = identificador.toLowerCase();
  if (await loginBloqueado(clave)) {
    return { error: "Demasiados intentos. Espera unos minutos e intenta de nuevo." };
  }

  const r = await resolverLoginPassword(identificador, password);
  if (r.tipo === "error") {
    await registrarFalloLogin(clave);
    await new Promise((res) => setTimeout(res, 900));
    if (r.motivo === "inactivo") return { error: "Tu cuenta no está activa. Escríbenos por WhatsApp." };
    return { error: "Correo/usuario o contraseña incorrectos." };
  }
  await limpiarFallosLogin(clave);

  // Staff: 2FA OBLIGATORIO para todo rol (admin y asesor) — ambos ven datos
  // de alumnos y pagos, así que ningún rol queda exento (M-16, Ola 3).
  if (r.tipo === "staff") {
    const enviado = await emitirCodigo2faStaff(r.id);
    if (enviado) return { reto2fa: tokenRetoStaff(r.id) };
    // Sin correo no podemos enviar el código (no debería pasar: email es
    // obligatorio en `usuarios`); por resiliencia no bloqueamos el acceso.
    await crearSesion(r.id);
    redirect("/panel");
  }

  // Alumno: si tiene 2FA, pedimos el código por correo antes de crear la sesión.
  if (await dosFactoresActivo(r.id)) {
    const enviado = await emitirCodigo2fa(r.id);
    if (enviado) return { reto2fa: tokenReto(r.id) };
    // Sin correo no podemos enviar el código: entramos igual (no bloqueamos).
  }
  await crearSesionAlumno(r.id);
  redirect("/portal");
}

/** Segundo paso del login con 2FA: valida el código y crea la sesión
 *  correcta (staff → panel, alumno → portal) según el tipo del reto. */
export async function verificar2faAccion(_prev: EstadoLogin, fd: FormData): Promise<EstadoLogin> {
  const token = String(fd.get("reto") ?? "");
  const codigo = String(fd.get("codigo") ?? "").replace(/\D+/g, "");
  const cuenta = cuentaDeReto(token);
  if (!cuenta) return { error: "La sesión expiró. Vuelve a iniciar sesión." };
  if (codigo.length !== 6) return { error: "Escribe el código de 6 dígitos.", reto2fa: token };

  if (cuenta.tipo === "staff") {
    if (!(await verificarCodigo2faStaff(cuenta.id, codigo))) {
      await new Promise((res) => setTimeout(res, 700));
      return { error: "Código incorrecto o vencido.", reto2fa: token };
    }
    await crearSesion(cuenta.id);
    redirect("/panel");
  }

  if (!(await verificarCodigo2fa(cuenta.id, codigo))) {
    await new Promise((res) => setTimeout(res, 700));
    return { error: "Código incorrecto o vencido.", reto2fa: token };
  }
  await crearSesionAlumno(cuenta.id);
  redirect("/portal");
}
