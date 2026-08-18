"use server";
import { solicitarReset } from "@/lib/panel/reset";
import { restablecerConToken } from "@/lib/panel/reset";

export type EstadoReset = { ok?: string; error?: string };

// Freno simple en memoria por email (evita spamear el buzón).
const ultimos = new Map<string, number>();

export async function solicitarResetAccion(_prev: EstadoReset, fd: FormData): Promise<EstadoReset> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!/.+@.+\..+/.test(email)) return { error: "Escribe un correo válido" };
  const antes = ultimos.get(email) ?? 0;
  if (Date.now() - antes < 60_000) {
    return { ok: "Si el correo está registrado, ya te enviamos las instrucciones. Revisa tu bandeja (y el spam)." };
  }
  ultimos.set(email, Date.now());
  await solicitarReset(email);
  // Respuesta genérica SIEMPRE: no revela si el correo existe.
  return { ok: "Si el correo está registrado, te enviamos un enlace para crear una nueva contraseña. Revisa tu bandeja (y el spam)." };
}

export async function restablecerAccion(_prev: EstadoReset, fd: FormData): Promise<EstadoReset> {
  const token = String(fd.get("token") ?? "");
  const password = String(fd.get("password") ?? "");
  const confirma = String(fd.get("confirma") ?? "");
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" };
  if (password !== confirma) return { error: "Las contraseñas no coinciden" };
  const ok = await restablecerConToken(token, password);
  if (!ok) return { error: "El enlace ya no es válido (venció o ya se usó). Solicita uno nuevo." };
  return { ok: "¡Listo! Tu contraseña se actualizó. Ya puedes iniciar sesión." };
}
