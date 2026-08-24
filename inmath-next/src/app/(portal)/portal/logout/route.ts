import { NextRequest, NextResponse } from "next/server";
import { cerrarSesionAlumno } from "@/lib/portal/sesion";

/** Cierra la sesión del alumno y vuelve al login único. Detrás de nginx req.url
 *  resuelve al bind interno (0.0.0.0:3010), así que preferimos APP_URL.
 *  IMPORTANTE: los borrados vía cookies() de next/headers NO se mezclan de
 *  forma confiable con NextResponse.redirect() en un route handler — hay que
 *  borrarlas también sobre el response que de verdad se devuelve, o el login
 *  único ve la cookie todavía viva y rebota de regreso al portal. */
export async function POST(req: NextRequest) {
  await cerrarSesionAlumno();
  const base = (process.env.APP_URL ?? "").replace(/\/$/, "") || req.url;
  const res = NextResponse.redirect(new URL("/panel/login", base), { status: 303 });
  // OJO: res.cookies.delete() guarda por NOMBRE — una segunda llamada con el
  // mismo nombre pero distinto path SOBRESCRIBE la primera en vez de sumarse
  // (solo sale un Set-Cookie). La cookie real vive en path "/", así que esa
  // llamada debe ir AL FINAL para que sea la que de verdad se envíe.
  res.cookies.delete({ name: "inmath_alumno", path: "/portal" });
  res.cookies.delete({ name: "inmath_alumno", path: "/" });
  return res;
}
