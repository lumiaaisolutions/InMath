import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { googlePerfilDesdeCodigo } from "@/lib/portal/google";
import { googleConfigurado } from "@/lib/portal/auth";
import { resolverLoginEmail } from "@/lib/auth-unificado";
import { crearSesion } from "@/lib/panel/sesion";
import { crearSesionAlumno } from "@/lib/portal/sesion";

/** Callback de Google (login ÚNICO): valida state, canjea el code y abre la
 *  sesión correcta — staff → /panel, alumno (con pago) → /portal. */
export async function GET(req: NextRequest) {
  const login = (q: string) => NextResponse.redirect(new URL(`/panel/login?error=${q}`, req.url));
  if (!googleConfigurado()) return login("google-no-config");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const esperado = jar.get("inmath_g_state")?.value;
  jar.delete({ name: "inmath_g_state", path: "/api/portal/google" });
  if (!code || !state || !esperado || state !== esperado) return login("google-estado");

  const perfil = await googlePerfilDesdeCodigo(code);
  if (!perfil || !perfil.emailVerificado) return login("google-correo");

  const acceso = await resolverLoginEmail(perfil.email);
  if (acceso.tipo === "error") {
    if (acceso.motivo === "inactivo") return login("google-no-alumno");
    // No existe cuenta con ese correo → completar el registro (wizard) antes de
    // continuar; no lo dejamos entrar hasta terminarlo.
    const q = new URLSearchParams({ correo: perfil.email, google: "1" });
    if (perfil.nombre) q.set("nombre", perfil.nombre);
    return NextResponse.redirect(new URL(`/pago?${q.toString()}`, req.url));
  }

  if (acceso.tipo === "staff") {
    await crearSesion(acceso.id);
    return NextResponse.redirect(new URL("/panel", req.url));
  }
  await crearSesionAlumno(acceso.id);
  return NextResponse.redirect(new URL("/portal", req.url));
}
