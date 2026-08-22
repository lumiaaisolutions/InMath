import { NextRequest, NextResponse } from "next/server";
import { cerrarSesionAlumno } from "@/lib/portal/sesion";

/** Cierra la sesión del alumno y vuelve al login único. Detrás de nginx req.url
 *  resuelve al bind interno (0.0.0.0:3010), así que preferimos APP_URL. */
export async function POST(req: NextRequest) {
  await cerrarSesionAlumno();
  const base = (process.env.APP_URL ?? "").replace(/\/$/, "") || req.url;
  return NextResponse.redirect(new URL("/panel/login", base), { status: 303 });
}
