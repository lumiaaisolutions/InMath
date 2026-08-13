"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { crearSesion } from "@/lib/panel/sesion";

export type EstadoLogin = { error?: string };

// Freno de fuerza bruta en memoria por email (capa 1, como el PHP por sesión).
const fallos = new Map<string, { n: number; hasta: number }>();

export async function loginAccion(_prev: EstadoLogin, fd: FormData): Promise<EstadoLogin> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const f = fallos.get(email);
  if (f && f.n >= 5 && Date.now() < f.hasta) {
    return { error: "Demasiados intentos. Espera unos segundos e intenta de nuevo." };
  }
  const usuario = await prisma.usuarios.findFirst({ where: { email, activo: true } });
  if (!usuario || !(await bcrypt.compare(password, usuario.password_hash))) {
    const n = (f?.n ?? 0) + 1;
    fallos.set(email, { n, hasta: Date.now() + Math.min(8, Math.max(1, n - 3)) * 1000 });
    await new Promise((r) => setTimeout(r, 1000));
    return { error: "Correo o contraseña incorrectos" };
  }
  fallos.delete(email);
  await crearSesion(usuario.id);
  redirect("/panel");
}
