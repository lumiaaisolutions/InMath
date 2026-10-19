"use server";
import { solicitarReset } from "@/lib/panel/reset";
import { restablecerConToken } from "@/lib/panel/reset";
import { limiteExcedido } from "@/lib/rate-limit";

export type EstadoReset = { ok?: string; error?: string };

export async function solicitarResetAccion(_prev: EstadoReset, fd: FormData): Promise<EstadoReset> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!/.+@.+\..+/.test(email)) return { error: "Escribe un correo válido" };
  // Freno PERSISTENTE (B-17): máx. 5 solicitudes cada 15 min por correo — en BD
  // (misma técnica que A-05), así sobrevive reinicios de pm2 y aplica aunque
  // haya varios procesos. Antes era un Map en memoria (se perdía al reiniciar).
  if (await limiteExcedido(`reset-solicitar:${email}`, 5, 15 * 60_000)) {
    return { ok: "Si el correo está registrado, ya te enviamos las instrucciones. Revisa tu bandeja (y el spam)." };
  }
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
