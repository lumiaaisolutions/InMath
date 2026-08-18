"use server";
import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { requiereAdmin } from "@/lib/panel/sesion";
import { dirImgPanel } from "@/lib/panel/media";
import { ESTILOS, type Alerta } from "@/lib/alertas";
import type { Resultado } from "../acciones";

export type ResultadoMedia = Resultado & { ruta?: string };

/** Sube imagen (re-codificada 1600×1000 con sharp) o video MP4 para una alerta. */
export async function alertaMediaSubirAccion(_prev: ResultadoMedia, fd: FormData): Promise<ResultadoMedia> {
  await requiereAdmin();
  const archivo = fd.get("media");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elige un archivo válido" };
  if (archivo.size > 25 * 1024 * 1024) return { error: "El archivo no puede pesar más de 25 MB" };
  const ext = (archivo.name.split(".").pop() ?? "").toLowerCase();
  if (!["jpg", "jpeg", "png", "webp", "mp4"].includes(ext)) return { error: "Solo se aceptan JPG, PNG, WebP o MP4" };
  const dir = path.join(dirImgPanel(), "alertas");
  await mkdir(dir, { recursive: true });
  const base = `al-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
  const buf = Buffer.from(await archivo.arrayBuffer());
  if (ext === "mp4") {
    if (buf.subarray(4, 8).toString("latin1") !== "ftyp") return { error: "Ese MP4 no parece válido" };
    await writeFile(path.join(dir, `${base}.mp4`), buf);
    return { ok: "Video agregado", ruta: `/panel/img/alertas/${base}.mp4` };
  }
  try {
    await sharp(buf).resize(1600, 1000, { fit: "cover" }).jpeg({ quality: 86 }).toFile(path.join(dir, `${base}.jpg`));
  } catch { return { error: "No pudimos procesar esa imagen, intenta con otra" }; }
  return { ok: "Imagen agregada", ruta: `/panel/img/alertas/${base}.jpg` };
}

/** Guarda el arreglo completo de alertas de la landing. */
export async function guardarAlertasAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const u = await requiereAdmin();
  let alertas: Alerta[];
  try {
    alertas = JSON.parse(String(fd.get("alertas") ?? "[]"));
    if (!Array.isArray(alertas)) throw new Error();
  } catch {
    return { error: "Datos de alertas inválidos" };
  }
  if (alertas.length > 6) return { error: "Máximo 6 alertas" };
  for (const a of alertas) {
    if (a.activo && !String(a.titulo ?? "").trim() && !String(a.texto ?? "").trim()) {
      return { error: "Cada alerta activa necesita al menos un título o un texto" };
    }
    if (a.estilo && !ESTILOS.includes(a.estilo)) return { error: "Estilo inválido" };
  }

  await prisma.configuraciones.upsert({
    where: { clave: "alertas_landing" },
    update: { valor: JSON.stringify(alertas), actualizado_por: u.id },
    create: { clave: "alertas_landing", valor: JSON.stringify(alertas), tipo: "json", descripcion: "Alertas personalizables de la landing", actualizado_por: u.id },
  });
  revalidatePath("/");
  revalidatePath("/panel/alertas");
  return { ok: "Alertas guardadas — ya están en la página" };
}
