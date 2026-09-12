"use server";
import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { prisma } from "@/lib/db";
import { requiereModulo } from "@/lib/panel/sesion";
import { dirImgPanel } from "@/lib/panel/media";
import { contenidoCoincideConExtension } from "@/lib/magic-bytes";

export type Resultado = { ok?: string; error?: string };

const EXT_VIDEO = [".mp4", ".mov", ".webm"];
const MAX_VIDEO = 200 * 1024 * 1024; // 200 MB

type RecursoEntrada = { dbId?: number; tipo: string; titulo: string; url: string };

function leerRecursos(fd: FormData): { error: string } | RecursoEntrada[] {
  let crudo: unknown;
  try { crudo = JSON.parse(String(fd.get("recursos") ?? "[]")); } catch { return { error: "No pudimos leer los videos/materiales." }; }
  if (!Array.isArray(crudo)) return { error: "Formato de recursos inválido." };
  if (crudo.length > 60) return { error: "Máximo 60 videos/materiales por fase." };

  const recursos: RecursoEntrada[] = [];
  for (const r of crudo) {
    const tipo = String((r as { tipo?: unknown })?.tipo ?? "");
    const titulo = String((r as { titulo?: unknown })?.titulo ?? "").trim();
    const url = String((r as { url?: unknown })?.url ?? "").trim();
    if (!["video_link", "video_archivo", "documento"].includes(tipo)) return { error: "Tipo de recurso inválido." };
    if (!titulo) return { error: "Cada video/material necesita un título." };
    if (!url) return { error: `"${titulo}" quedó sin enlace o archivo.` };
    if (tipo === "video_link" && !/^https?:\/\//i.test(url)) return { error: `El link de "${titulo}" debe empezar con http:// o https://` };
    const dbIdRaw = (r as { dbId?: unknown })?.dbId;
    recursos.push({ dbId: typeof dbIdRaw === "number" ? dbIdRaw : undefined, tipo, titulo, url });
  }
  return recursos;
}

type ExamenEntrada = { examenId: number };

function leerExamenes(fd: FormData): { error: string } | ExamenEntrada[] {
  let crudo: unknown;
  try { crudo = JSON.parse(String(fd.get("examenes") ?? "[]")); } catch { return { error: "No pudimos leer los exámenes." }; }
  if (!Array.isArray(crudo)) return { error: "Formato de exámenes inválido." };
  const examenes: ExamenEntrada[] = [];
  for (const e of crudo) {
    const examenId = Number((e as { examenId?: unknown })?.examenId);
    if (!Number.isInteger(examenId) || examenId < 1) continue;
    examenes.push({ examenId });
  }
  return examenes;
}

/** Crea o guarda una fase completa (datos, recursos y exámenes asignados) en una sola operación. */
export async function faseGuardarAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const u = await requiereModulo("reactivos");
  const faseId = parseInt(String(fd.get("fase_id") ?? "0"), 10) || null;
  const cursoId = parseInt(String(fd.get("curso_id") ?? "0"), 10);
  const titulo = String(fd.get("titulo") ?? "").trim();
  const descripcion = String(fd.get("descripcion") ?? "").trim() || null;
  const porcentajeMinimo = Math.min(100, Math.max(0, parseInt(String(fd.get("porcentaje_minimo") ?? "70"), 10) || 70));
  if (cursoId < 1) return { error: "Elige un curso" };
  if (!titulo) return { error: "La fase necesita un título" };

  const recursos = leerRecursos(fd);
  if ("error" in recursos) return recursos;
  const examenes = leerExamenes(fd);
  if ("error" in examenes) return examenes;

  const ordenRaw = fd.get("orden");
  const ordenManual = ordenRaw !== null && ordenRaw !== "" ? parseInt(String(ordenRaw), 10) : null;

  await prisma.$transaction(async (tx) => {
    let fase;
    if (faseId) {
      fase = await tx.fases.update({
        where: { id: faseId },
        data: { curso_id: cursoId, titulo, descripcion, porcentaje_minimo: porcentajeMinimo, ...(ordenManual !== null ? { orden: ordenManual } : {}) },
      });
    } else {
      const ultima = await tx.fases.aggregate({ where: { curso_id: cursoId }, _max: { orden: true } });
      fase = await tx.fases.create({
        data: { curso_id: cursoId, titulo, descripcion, porcentaje_minimo: porcentajeMinimo, orden: ordenManual ?? (ultima._max.orden ?? 0) + 1, creado_por: u.id },
      });
    }

    await tx.fase_recursos.deleteMany({ where: { fase_id: fase.id } });
    if (recursos.length) {
      await tx.fase_recursos.createMany({
        data: recursos.map((r, i) => ({ fase_id: fase.id, tipo: r.tipo, titulo: r.titulo, url: r.url, orden: i })),
      });
    }

    await tx.fase_examenes.deleteMany({ where: { fase_id: fase.id } });
    if (examenes.length) {
      await tx.fase_examenes.createMany({
        data: examenes.map((e, i) => ({ fase_id: fase.id, examen_id: e.examenId, orden: i })),
      });
    }
  });

  revalidatePath("/panel/fases");
  revalidatePath("/portal/fases");
  return { ok: faseId ? "Fase actualizada" : "Fase creada" };
}

export async function faseActivaAccion(id: number, activo: boolean): Promise<Resultado> {
  await requiereModulo("reactivos");
  await prisma.fases.update({ where: { id }, data: { activo } });
  revalidatePath("/panel/fases");
  revalidatePath("/portal/fases");
  return { ok: activo ? "Fase activada" : "Fase desactivada" };
}

export async function faseBorrarAccion(id: number): Promise<Resultado> {
  await requiereModulo("reactivos");
  await prisma.fases.delete({ where: { id } });
  revalidatePath("/panel/fases");
  revalidatePath("/portal/fases");
  return { ok: "Fase eliminada" };
}

/** Sube un archivo de video para un recurso de fase (alternativa a pegar un link). */
export async function faseVideoSubirAccion(fd: FormData): Promise<{ ok?: { nombre: string; url: string }; error?: string }> {
  await requiereModulo("reactivos");
  const archivo = fd.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elige un archivo de video válido" };
  if (archivo.size > MAX_VIDEO) return { error: "El video pesa más de 200 MB" };
  const ext = path.extname(archivo.name).toLowerCase();
  if (!EXT_VIDEO.includes(ext)) return { error: `Formato de video no permitido (${ext || "sin extensión"}) — usa .mp4, .mov o .webm` };
  const contenido = Buffer.from(await archivo.arrayBuffer());
  if (!contenidoCoincideConExtension(ext, contenido)) {
    return { error: `El archivo no parece ser un ${ext} real (revisa que no esté corrupto o renombrado)` };
  }
  const dir = path.join(dirImgPanel(), "fases");
  await mkdir(dir, { recursive: true });
  const base = path.basename(archivo.name, ext).replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 40) || "video";
  const nombreArchivo = `${base}-${randomBytes(4).toString("hex")}${ext}`;
  try {
    await writeFile(path.join(dir, nombreArchivo), contenido);
  } catch { return { error: "No pudimos guardar el video" }; }
  return { ok: { nombre: archivo.name, url: `/panel/img/fases/${nombreArchivo}` } };
}

/** Sube un documento de apoyo para una fase (mismo límite que materiales del curso). */
export async function faseDocumentoSubirAccion(fd: FormData): Promise<{ ok?: { nombre: string; url: string }; error?: string }> {
  await requiereModulo("reactivos");
  const archivo = fd.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elige un archivo válido" };
  const MAX_DOC = 60 * 1024 * 1024;
  if (archivo.size > MAX_DOC) return { error: "El archivo pesa más de 60 MB" };
  const ext = path.extname(archivo.name).toLowerCase();
  const EXT_DOC = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".zip", ".jpg", ".jpeg", ".png", ".webp"];
  if (!EXT_DOC.includes(ext)) return { error: `Tipo de archivo no permitido (${ext || "sin extensión"})` };
  const contenido = Buffer.from(await archivo.arrayBuffer());
  if (!contenidoCoincideConExtension(ext, contenido)) {
    return { error: `El archivo no parece ser un ${ext} real (revisa que no esté corrupto o renombrado)` };
  }
  const dir = path.join(dirImgPanel(), "fases");
  await mkdir(dir, { recursive: true });
  const base = path.basename(archivo.name, ext).replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 40) || "documento";
  const nombreArchivo = `${base}-${randomBytes(4).toString("hex")}${ext}`;
  try {
    await writeFile(path.join(dir, nombreArchivo), contenido);
  } catch { return { error: "No pudimos guardar el archivo" }; }
  return { ok: { nombre: archivo.name, url: `/panel/img/fases/${nombreArchivo}` } };
}
