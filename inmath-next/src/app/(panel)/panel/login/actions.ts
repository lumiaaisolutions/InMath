"use server";
import { redirect } from "next/navigation";
import { resolverLoginPassword } from "@/lib/auth-unificado";
import { crearSesion } from "@/lib/panel/sesion";
import { crearSesionAlumno } from "@/lib/portal/sesion";
import { dosFactoresActivo, emitirCodigo2fa, verificarCodigo2fa, tokenReto, alumnoDeReto } from "@/lib/portal/dosfactores";

export type EstadoLogin = { error?: string; reto2fa?: string };

// Freno de fuerza bruta en memoria por identificador (correo o usuario).
const fallos = new Map<string, { n: number; hasta: number }>();

export async function loginAccion(_prev: EstadoLogin, fd: FormData): Promise<EstadoLogin> {
  const identificador = String(fd.get("identificador") ?? fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!identificador || !password) return { error: "Escribe tu correo o usuario y tu contraseña." };

  const clave = identificador.toLowerCase();
  const f = fallos.get(clave);
  if (f && f.n >= 5 && Date.now() < f.hasta) {
    return { error: "Demasiados intentos. Espera unos segundos e intenta de nuevo." };
  }

  const r = await resolverLoginPassword(identificador, password);
  if (r.tipo === "error") {
    const n = (f?.n ?? 0) + 1;
    fallos.set(clave, { n, hasta: Date.now() + Math.min(8, Math.max(1, n - 3)) * 1000 });
    await new Promise((res) => setTimeout(res, 900));
    if (r.motivo === "inactivo") return { error: "Tu cuenta no está activa. Escríbenos por WhatsApp." };
    return { error: "Correo/usuario o contraseña incorrectos." };
  }
  fallos.delete(clave);

  if (r.tipo === "staff") {
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

/** Segundo paso del login con 2FA: valida el código y crea la sesión. */
export async function verificar2faAccion(_prev: EstadoLogin, fd: FormData): Promise<EstadoLogin> {
  const token = String(fd.get("reto") ?? "");
  const codigo = String(fd.get("codigo") ?? "").replace(/\D+/g, "");
  const alumnoId = alumnoDeReto(token);
  if (!alumnoId) return { error: "La sesión expiró. Vuelve a iniciar sesión." };
  if (codigo.length !== 6) return { error: "Escribe el código de 6 dígitos.", reto2fa: token };
  if (!(await verificarCodigo2fa(alumnoId, codigo))) {
    await new Promise((res) => setTimeout(res, 700));
    return { error: "Código incorrecto o vencido.", reto2fa: token };
  }
  await crearSesionAlumno(alumnoId);
  redirect("/portal");
}
