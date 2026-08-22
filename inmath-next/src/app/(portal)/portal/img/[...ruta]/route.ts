import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { dirPortal } from "@/lib/portal/media";
import { alumnoActual } from "@/lib/portal/sesion";

/** GET /portal/img/{archivo} — sirve avatar/banner del portal (solo .jpg).
 *  Requiere sesión de alumno y SOLO sirve los archivos del propio alumno
 *  (`{id}-avatar.jpg` / `{id}-banner.jpg`) — evita enumerar fotos ajenas. */
export async function GET(_req: Request, ctx: { params: Promise<{ ruta: string[] }> }) {
  const alumno = await alumnoActual();
  if (!alumno) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { ruta } = await ctx.params;
  const nombre = (ruta ?? []).join("/");
  // Solo las imágenes del alumno logueado, sin traspaso de rutas.
  if (!new RegExp(`^${alumno.id}-(avatar|banner)\\.jpg$`).test(nombre)) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  try {
    const contenido = await readFile(path.join(dirPortal(), nombre));
    return new Response(new Uint8Array(contenido), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=60" },
    });
  } catch {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
}
