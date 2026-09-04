import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { googlePerfilDesdeCodigo, googleTokensCalendarDesdeCodigo } from "@/lib/portal/google";
import { guardarCredencialCalendar } from "@/lib/google-calendar";
import { googleConfigurado } from "@/lib/portal/auth";
import { resolverLoginEmail } from "@/lib/auth-unificado";
import { crearSesion } from "@/lib/panel/sesion";
import { crearSesionAlumno } from "@/lib/portal/sesion";
import { dosFactoresActivo, emitirCodigo2fa, tokenReto } from "@/lib/portal/dosfactores";

/** Callback de Google (login ÚNICO): valida state, canjea el code y abre la
 *  sesión correcta — staff → /panel, alumno (con pago) → /portal. */
export async function GET(req: NextRequest) {
  // Detrás de nginx, req.url resuelve al bind interno (0.0.0.0:3010) y las
  // redirecciones absolutas saldrían rotas. Usamos APP_URL como base pública.
  const base = (process.env.APP_URL ?? "").replace(/\/$/, "") || req.url;
  const irA = (path: string) => NextResponse.redirect(new URL(path, base));
  const login = (q: string) => irA(`/panel/login?error=${q}`);
  if (!googleConfigurado()) return login("google-no-config");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const esperado = jar.get("inmath_g_state")?.value;
  jar.delete({ name: "inmath_g_state", path: "/api/portal/google" });
  if (!code || !state || !esperado || state !== esperado) return login("google-estado");

  // Rama especial: CONECTAR GOOGLE CALENDAR (state con prefijo gcal_, la
  // inicia un admin desde /panel/configuracion). Guarda el refresh token que
  // usa el respaldo directo del link de Meet y regresa al panel — aquí no
  // hay login de por medio.
  if (state.startsWith("gcal_")) {
    const tokens = await googleTokensCalendarDesdeCodigo(code);
    if (!tokens) return irA("/panel/configuracion?calendar=error");
    await guardarCredencialCalendar(tokens.refreshToken, tokens.email, null);
    return irA("/panel/configuracion?calendar=conectada");
  }

  const perfil = await googlePerfilDesdeCodigo(code);
  if (!perfil || !perfil.emailVerificado) return login("google-correo");

  const acceso = await resolverLoginEmail(perfil.email);
  if (acceso.tipo === "error") {
    if (acceso.motivo === "inactivo") return login("google-no-alumno");
    // No existe cuenta con ese correo → completar el registro (wizard) antes de
    // continuar; no lo dejamos entrar hasta terminarlo.
    const q = new URLSearchParams({ correo: perfil.email, google: "1" });
    if (perfil.nombre) q.set("nombre", perfil.nombre);
    return irA(`/pago?${q.toString()}`);
  }

  if (acceso.tipo === "staff") {
    await crearSesion(acceso.id);
    return irA("/panel");
  }
  // La verificación en 2 pasos también aplica al login con Google: si el
  // alumno la activó, se le envía el código y se le manda a la pantalla de
  // "Verifica que eres tú" — sin sesión hasta validar.
  if (await dosFactoresActivo(acceso.id)) {
    const enviado = await emitirCodigo2fa(acceso.id);
    if (enviado) return irA(`/panel/login?reto2fa=${encodeURIComponent(tokenReto(acceso.id))}`);
  }
  await crearSesionAlumno(acceso.id);
  return irA("/portal");
}
