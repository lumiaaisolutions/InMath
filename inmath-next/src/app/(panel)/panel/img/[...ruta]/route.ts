import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { dirImgPanel } from "@/lib/panel/media";
import { usuarioActual } from "@/lib/panel/sesion";
import { alumnoActual } from "@/lib/portal/sesion";
import { tienePagoConfirmado } from "@/lib/portal/auth";

// Sin .svg a propósito: un SVG puede llevar <script> embebido que el
// navegador ejecuta si se abre/incrusta directo — ningún flujo de subida
// actual genera .svg, así que quitarlo no rompe nada (B-15).
const MIME: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".mp4": "video/mp4",
  ".pdf": "application/pdf", ".mp3": "audio/mpeg",
  ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint", ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".xls": "application/vnd.ms-excel", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".zip": "application/zip",
};

/** Sirve los uploads del panel (avatars/, login/, alertas/, materiales/) desde PANEL_IMG_DIR. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ ruta: string[] }> }) {
  const { ruta } = await ctx.params;
  // basename por segmento: sin traversal, y solo dentro de los subdirs conocidos
  const segmentos = ruta.map((s) => path.basename(s));
  if (!["avatars", "login", "alertas", "materiales", "reactivos"].includes(segmentos[0]) || segmentos.length !== 2) {
    return new Response("No encontrado", { status: 404 });
  }
  // A-04: "materiales" (contenido del curso) y "reactivos" (preguntas/exámenes)
  // son contenido de PAGO — antes cualquiera con el link los descargaba sin
  // sesión. Acepta staff del panel O alumno con pago confirmado; el resto de
  // carpetas (avatars/login/alertas) sigue público, sin cambios.
  if (segmentos[0] === "materiales" || segmentos[0] === "reactivos") {
    const [panel, alumno] = await Promise.all([usuarioActual(), alumnoActual()]);
    const autorizado = panel || (alumno && (await tienePagoConfirmado(alumno.prospecto_id)));
    if (!autorizado) return new Response("No encontrado", { status: 404 });
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
