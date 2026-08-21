import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { dirPortal } from "@/lib/portal/media";

/** GET /portal/img/{archivo} — sirve avatar/banner del portal (solo .jpg). */
export async function GET(_req: Request, ctx: { params: Promise<{ ruta: string[] }> }) {
  const { ruta } = await ctx.params;
  const nombre = (ruta ?? []).join("/");
  // Solo nombres simples de imagen, sin traspaso de rutas.
  if (!/^[\w.-]+\.jpg$/.test(nombre)) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  try {
    const contenido = await readFile(path.join(dirPortal(), nombre));
    return new Response(new Uint8Array(contenido), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=60" },
    });
  } catch {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
}
