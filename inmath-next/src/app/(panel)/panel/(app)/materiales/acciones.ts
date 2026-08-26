"use server";
import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { requiereAdmin } from "@/lib/panel/sesion";
import { dirImgPanel } from "@/lib/panel/media";
import { guardarMateriales, type Material } from "@/lib/portal/materiales";

export type ResultadoMateriales = { ok?: string; error?: string };

const TIPOS = ["documento", "video", "enlace"] as const;
const EXT_PERMITIDAS = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".zip", ".mp4", ".mp3", ".jpg", ".jpeg", ".png", ".webp"];
const MAX_ARCHIVO = 60 * 1024 * 1024; // 60 MB

function nombreUnico(original: string): string {
  const ext = path.extname(original).toLowerCase();
  const base = path.basename(original, ext).replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 40) || "archivo";
  return `${base}-${randomBytes(4).toString("hex")}${ext}`;
}

/** Sube un archivo de material (PDF, video, doc, etc.) y devuelve su URL pública. */
export async function materialArchivoSubirAccion(fd: FormData): Promise<{ ok?: { nombre: string; url: string; tamanoBytes: number }; error?: string }> {
  await requiereAdmin();
  const archivo = fd.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elige un archivo válido" };
  if (archivo.size > MAX_ARCHIVO) return { error: "El archivo pesa más de 60 MB" };
  const ext = path.extname(archivo.name).toLowerCase();
  if (!EXT_PERMITIDAS.includes(ext)) return { error: `Tipo de archivo no permitido (${ext || "sin extensión"})` };
  const dir = path.join(dirImgPanel(), "materiales");
  await mkdir(dir, { recursive: true });
  const nombreArchivo = nombreUnico(archivo.name);
  try {
    await writeFile(path.join(dir, nombreArchivo), Buffer.from(await archivo.arrayBuffer()));
  } catch { return { error: "No pudimos guardar el archivo" }; }
  return { ok: { nombre: archivo.name, url: `/panel/img/materiales/${nombreArchivo}`, tamanoBytes: archivo.size } };
}

/** Sube la imagen de portada de un material (recorte 800×450, estilo miniatura de video). */
export async function materialPortadaSubirAccion(fd: FormData): Promise<{ ok?: string; error?: string }> {
  await requiereAdmin();
  const imagen = fd.get("imagen");
  if (!(imagen instanceof File) || imagen.size === 0) return { error: "Elige una imagen válida" };
  if (imagen.size > 8 * 1024 * 1024) return { error: "Solo JPG, PNG o WebP de hasta 8 MB" };
  const dir = path.join(dirImgPanel(), "materiales");
  await mkdir(dir, { recursive: true });
  const nombreArchivo = `portada-${randomBytes(6).toString("hex")}.jpg`;
  try {
    await sharp(Buffer.from(await imagen.arrayBuffer()))
      .resize(800, 450, { fit: "cover" }).jpeg({ quality: 85 })
      .toFile(path.join(dir, nombreArchivo));
  } catch { return { error: "No pudimos procesar esa imagen" }; }
  return { ok: `/panel/img/materiales/${nombreArchivo}` };
}

export async function guardarMaterialesAccion(_prev: ResultadoMateriales, fd: FormData): Promise<ResultadoMateriales> {
  const u = await requiereAdmin();
  let lista: Material[];
  try {
    lista = JSON.parse(String(fd.get("materiales") ?? "[]"));
  } catch {
    return { error: "No pudimos leer la lista de materiales." };
  }
  if (!Array.isArray(lista)) return { error: "Formato inválido." };
  if (lista.length > 40) return { error: "Máximo 40 materiales." };

  const limpia: Material[] = [];
  for (const m of lista) {
    const titulo = String(m?.titulo ?? "").trim();
    if (!titulo) continue;
    const tipo = (TIPOS as readonly string[]).includes(m?.tipo) ? m.tipo : "enlace";
    const descripcion = String(m?.descripcion ?? "").trim().slice(0, 500);
    const portada = typeof m?.portada === "string" && m.portada ? m.portada : null;
    if (tipo === "enlace") {
      const url = String(m?.url ?? "").trim();
      if (!/^https?:\/\//i.test(url)) return { error: `El enlace de "${titulo}" debe empezar con http:// o https://` };
      limpia.push({ id: String(m?.id ?? limpia.length), titulo, descripcion, tipo, portada, url, archivos: [], orden: limpia.length });
    } else {
      let archivos = Array.isArray(m?.archivos) ? m.archivos.filter((a: unknown): a is Material["archivos"][number] =>
        !!a && typeof (a as { url?: unknown }).url === "string" && typeof (a as { nombre?: unknown }).nombre === "string") : [];
      // Compatibilidad con material antiguo (solo enlace, sin archivo real subido).
      const urlLegado = String(m?.url ?? "").trim();
      if (!archivos.length && /^https?:\/\//i.test(urlLegado)) archivos = [{ nombre: titulo, url: urlLegado, tamanoBytes: 0 }];
      if (!archivos.length) return { error: `"${titulo}" necesita al menos un archivo subido` };
      limpia.push({ id: String(m?.id ?? limpia.length), titulo, descripcion, tipo, portada, url: "", archivos, orden: limpia.length });
    }
  }

  await guardarMateriales(limpia, u.id);
  revalidatePath("/panel/materiales");
  revalidatePath("/portal/material");
  return { ok: `Material guardado (${limpia.length}).` };
}
