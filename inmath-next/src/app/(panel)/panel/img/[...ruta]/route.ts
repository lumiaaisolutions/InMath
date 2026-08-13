import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { dirImgPanel } from "@/lib/panel/media";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".mp4": "video/mp4", ".svg": "image/svg+xml",
};

/** Sirve los uploads del panel (avatars/, login/) desde PANEL_IMG_DIR. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ ruta: string[] }> }) {
  const { ruta } = await ctx.params;
  // basename por segmento: sin traversal, y solo dentro de los subdirs conocidos
  const segmentos = ruta.map((s) => path.basename(s));
  if (!["avatars", "login"].includes(segmentos[0]) || segmentos.length !== 2) {
    return new Response("No encontrado", { status: 404 });
  }
  const ext = path.extname(segmentos[1]).toLowerCase();
  if (!MIME[ext]) return new Response("No encontrado", { status: 404 });
  try {
    const contenido = await readFile(path.join(dirImgPanel(), ...segmentos));
    return new Response(new Uint8Array(contenido), {
      headers: { "Content-Type": MIME[ext], "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
