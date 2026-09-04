import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { dirPortal } from "@/lib/portal/media";
import { usuarioActual } from "@/lib/panel/sesion";

/** GET /panel/api/alumno-img/{id}-avatar.jpg|{id}-banner.jpg — la puerta del
 *  STAFF a las fotos/portadas que los alumnos suben en su portal (la ruta
 *  /portal/img solo sirve al propio alumno). Requiere sesión del panel; la
 *  cookie del panel tiene path /panel, por eso vive bajo /panel/api. */
export async function GET(_req: Request, ctx: { params: Promise<{ ruta: string[] }> }) {
  const u = await usuarioActual();
  if (!u) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const nombre = ((await ctx.params).ruta ?? []).join("/");
  if (!/^\d+-(avatar|banner)\.jpg$/.test(nombre)) {
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
