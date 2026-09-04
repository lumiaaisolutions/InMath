import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { requiereModulo } from "@/lib/panel/sesion";
import { googleAuthUrlCalendar } from "@/lib/portal/google";
import { googleConfigurado } from "@/lib/portal/auth";

/** Paso ÚNICO del dueño: "Conectar Google Calendar" en /panel/configuracion.
 *  Redirige a Google (cuenta cursosinmath@gmail.com) para autorizar la
 *  creación de eventos con Meet — es el RESPALDO directo cuando el robot
 *  (n8n) falla al generar el link de una cita. Vive bajo /panel/api porque
 *  la cookie de sesión del panel tiene path /panel. */
export async function GET(req: NextRequest) {
  await requiereModulo("calendario_respaldo");
  const base = (process.env.APP_URL ?? "").replace(/\/$/, "") || req.url;
  if (!googleConfigurado()) {
    return NextResponse.redirect(new URL("/panel/configuracion?calendar=no-config", base));
  }
  const state = `gcal_${randomBytes(16).toString("hex")}`;
  (await cookies()).set("inmath_g_state", state, {
    httpOnly: true, sameSite: "lax", path: "/api/portal/google", maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });
  return NextResponse.redirect(googleAuthUrlCalendar(state));
}
