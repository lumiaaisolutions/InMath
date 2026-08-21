import { NextRequest, NextResponse } from "next/server";
import { cerrarSesionAlumno } from "@/lib/portal/sesion";

/** Cierra la sesión del alumno y vuelve al login único. Usa el origen de la
 *  petición (robusto en local y en prod, sin depender de APP_URL). */
export async function POST(req: NextRequest) {
  await cerrarSesionAlumno();
  return NextResponse.redirect(new URL("/panel/login", req.url), { status: 303 });
}
