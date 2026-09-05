"use server";
import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { prisma } from "@/lib/db";
import { requiereModulo } from "@/lib/panel/sesion";
import { dirImgPanel } from "@/lib/panel/media";

export type Resultado = { ok?: string; error?: string };

const MIN_OPCIONES = 2;
const MAX_OPCIONES = 6;
const EXT_PERMITIDAS = [".jpg", ".jpeg", ".png", ".webp", ".mp4", ".pdf"];
const MAX_ADJUNTO = 60 * 1024 * 1024; // 60 MB

function leerOpciones(fd: FormData): string[] {
  const opciones: string[] = [];
  for (let i = 0; i < 6; i++) {
    const v = String(fd.get(`opcion_${i}`) ?? "").trim();
    if (v) opciones.push(v);
  }
  return opciones;
}

function validarCampos(fd: FormData): { error: string } | {
  cursoId: number; tema: string | null; enunciado: string; opciones: string[]; correcta: number; explicacion: string | null;
} {
  const cursoId = parseInt(String(fd.get("curso_id") ?? "0"), 10);
  const tema = String(fd.get("tema") ?? "").trim() || null;
  const enunciado = String(fd.get("enunciado") ?? "").trim();
  const opciones = leerOpciones(fd);
  const correcta = parseInt(String(fd.get("respuesta_correcta") ?? "-1"), 10);
  const explicacion = String(fd.get("explicacion") ?? "").trim() || null;

  if (cursoId < 1) return { error: "Elige un curso" };
  if (!enunciado) return { error: "El enunciado es obligatorio" };
  if (opciones.length < 2) return { error: "Agrega al menos 2 opciones" };
  if (correcta < 0 || correcta >= opciones.length) return { error: "Marca cuál opción es la correcta" };
  return { cursoId, tema, enunciado, opciones, correcta, explicacion };
}

/** Reactivo suelto (sin examen) — se mantiene para práctica libre puntual. */
export async function reactivoCrearAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const u = await requiereModulo("reactivos");
  const v = validarCampos(fd);
  if ("error" in v) return v;
  await prisma.reactivos.create({
    data: {
      curso_id: v.cursoId, tema: v.tema, enunciado: v.enunciado,
      opciones: v.opciones as never, respuesta_correcta: v.correcta,
      explicacion: v.explicacion, creado_por: u.id,
    },
  });
  revalidatePath("/panel/reactivos");
  return { ok: "Reactivo agregado" };
}

export async function reactivoActualizarAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  await requiereModulo("reactivos");
  const id = parseInt(String(fd.get("id") ?? "0"), 10);
  if (id < 1) return { error: "Reactivo inválido" };
  const v = validarCampos(fd);
  if ("error" in v) return v;
  await prisma.reactivos.update({
    where: { id },
    data: {
      curso_id: v.cursoId, tema: v.tema, enunciado: v.enunciado,
      opciones: v.opciones as never, respuesta_correcta: v.correcta,
      explicacion: v.explicacion,
    },
  });
  revalidatePath("/panel/reactivos");
  return { ok: "Reactivo actualizado" };
}

/** Baja lógica — preserva la integridad del historial de intentos ya resueltos. */
export async function reactivoActivoAccion(id: number, activo: boolean): Promise<Resultado> {
  await requiereModulo("reactivos");
  await prisma.reactivos.update({ where: { id }, data: { activo } });
  revalidatePath("/panel/reactivos");
  return { ok: activo ? "Reactivo activado" : "Reactivo desactivado" };
}

// ---------------------------------------------------------------------------
// Exámenes: agrupan varias preguntas + material de apoyo por rango.
// ---------------------------------------------------------------------------

type PreguntaEntrada = {
  dbId?: number; enunciado: string; opciones: string[]; opcionesTipo: ("texto" | "imagen")[]; correcta: number;
  explicacion: string; adjuntoUrl: string | null; adjuntoTipo: string | null;
};
type AdjuntoEntrada = {
  dbId?: number; desde: number; hasta: number; tipo: string; nombre: string; url: string;
};

function leerPreguntas(fd: FormData): { error: string } | PreguntaEntrada[] {
  let crudo: unknown;
  try { crudo = JSON.parse(String(fd.get("preguntas") ?? "[]")); } catch { return { error: "No pudimos leer las preguntas." }; }
  if (!Array.isArray(crudo) || crudo.length === 0) return { error: "Agrega al menos una pregunta." };
  if (crudo.length > 100) return { error: "Máximo 100 preguntas por examen." };

  const preguntas: PreguntaEntrada[] = [];
  for (const [i, p] of crudo.entries()) {
    const enunciado = String((p as { enunciado?: unknown })?.enunciado ?? "").trim();
    if (!enunciado) return { error: `La pregunta ${i + 1} necesita un enunciado.` };
    const opciones = Array.isArray((p as { opciones?: unknown })?.opciones)
      ? (p as { opciones: unknown[] }).opciones.map((o) => String(o ?? "").trim()).filter(Boolean) : [];
    if (opciones.length < MIN_OPCIONES || opciones.length > MAX_OPCIONES) return { error: `La pregunta ${i + 1} necesita entre 2 y 6 opciones.` };
    const correcta = Number((p as { correcta?: unknown })?.correcta);
    if (!Number.isInteger(correcta) || correcta < 0 || correcta >= opciones.length) return { error: `Marca la respuesta correcta de la pregunta ${i + 1}.` };
    const explicacion = String((p as { explicacion?: unknown })?.explicacion ?? "").trim();
    const opcionesTipoRaw = (p as { opcionesTipo?: unknown })?.opcionesTipo;
    const opcionesTipo = opciones.map((_, idx) =>
      Array.isArray(opcionesTipoRaw) && opcionesTipoRaw[idx] === "imagen" ? "imagen" as const : "texto" as const);
    const adjuntoUrl = String((p as { adjuntoUrl?: unknown })?.adjuntoUrl ?? "").trim() || null;
    const adjuntoTipo = String((p as { adjuntoTipo?: unknown })?.adjuntoTipo ?? "").trim() || null;
    const dbIdRaw = (p as { dbId?: unknown })?.dbId;
    preguntas.push({ dbId: typeof dbIdRaw === "number" ? dbIdRaw : undefined, enunciado, opciones, opcionesTipo, correcta, explicacion, adjuntoUrl, adjuntoTipo });
  }
  return preguntas;
}

function leerAdjuntos(fd: FormData, totalPreguntas: number): { error: string } | AdjuntoEntrada[] {
  let crudo: unknown;
  try { crudo = JSON.parse(String(fd.get("adjuntos") ?? "[]")); } catch { return { error: "No pudimos leer los adjuntos." }; }
  if (!Array.isArray(crudo)) return { error: "Formato de adjuntos inválido." };

  const adjuntos: AdjuntoEntrada[] = [];
  for (const a of crudo) {
    const desde = Number((a as { desde?: unknown })?.desde);
    const hasta = Number((a as { hasta?: unknown })?.hasta);
    const tipo = String((a as { tipo?: unknown })?.tipo ?? "");
    const nombre = String((a as { nombre?: unknown })?.nombre ?? "").trim();
    const url = String((a as { url?: unknown })?.url ?? "").trim();
    if (!["imagen", "video", "documento"].includes(tipo)) return { error: "Tipo de adjunto inválido." };
    if (!url || !nombre) return { error: "Un adjunto quedó sin archivo." };
    if (!Number.isInteger(desde) || !Number.isInteger(hasta) || desde < 1 || hasta < desde || hasta > totalPreguntas) {
      return { error: `El rango de preguntas del adjunto "${nombre}" no es válido.` };
    }
    const dbIdRaw = (a as { dbId?: unknown })?.dbId;
    adjuntos.push({ dbId: typeof dbIdRaw === "number" ? dbIdRaw : undefined, desde, hasta, tipo, nombre, url });
  }
  return adjuntos;
}

/** Crea o guarda un examen completo (datos, preguntas y adjuntos) en una sola
 *  operación. El examen es genérico: `cursoIds` dice en qué modalidad(es)
 *  aparece — no se duplican preguntas por curso. */
export async function examenGuardarAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const u = await requiereModulo("reactivos");
  const examenId = parseInt(String(fd.get("examen_id") ?? "0"), 10) || null;
  const titulo = String(fd.get("titulo") ?? "").trim();
  const tema = String(fd.get("tema") ?? "").trim() || null;
  const porcentajeMinimo = Math.min(100, Math.max(0, parseInt(String(fd.get("porcentaje_minimo") ?? "70"), 10) || 70));
  const ordenAleatorio = String(fd.get("orden_aleatorio") ?? "1") === "1";
  let cursoIds: number[];
  try { cursoIds = JSON.parse(String(fd.get("curso_ids") ?? "[]")); } catch { return { error: "No pudimos leer las modalidades." }; }
  cursoIds = cursoIds.filter((n) => Number.isInteger(n) && n > 0);
  if (cursoIds.length === 0) return { error: "Elige al menos una modalidad donde mostrar el examen" };
  if (!titulo) return { error: "El examen necesita un título" };

  const preguntas = leerPreguntas(fd);
  if ("error" in preguntas) return preguntas;
  const adjuntos = leerAdjuntos(fd, preguntas.length);
  if ("error" in adjuntos) return adjuntos;

  await prisma.$transaction(async (tx) => {
    const examen = examenId
      ? await tx.examenes.update({ where: { id: examenId }, data: { titulo, tema, porcentaje_minimo: porcentajeMinimo, orden_aleatorio: ordenAleatorio } })
      : await tx.examenes.create({ data: { titulo, tema, porcentaje_minimo: porcentajeMinimo, orden_aleatorio: ordenAleatorio, creado_por: u.id } });

    await tx.examen_cursos.deleteMany({ where: { examen_id: examen.id } });
    await tx.examen_cursos.createMany({ data: cursoIds.map((curso_id) => ({ examen_id: examen.id, curso_id })) });

    const idsConservados: number[] = [];
    for (const [i, p] of preguntas.entries()) {
      const datos = {
        tema, enunciado: p.enunciado, opciones: p.opciones as never, opciones_tipo: p.opcionesTipo as never,
        respuesta_correcta: p.correcta, explicacion: p.explicacion || null,
        adjunto_url: p.adjuntoUrl, adjunto_tipo: p.adjuntoTipo, orden: i,
      };
      if (p.dbId) {
        await tx.reactivos.update({ where: { id: p.dbId }, data: { ...datos, activo: true } });
        idsConservados.push(p.dbId);
      } else {
        const creado = await tx.reactivos.create({ data: { ...datos, examen_id: examen.id, creado_por: u.id } });
        idsConservados.push(creado.id);
      }
    }
    // Preguntas quitadas del examen en esta edición: se desactivan (no se borran, por el historial de intentos).
    await tx.reactivos.updateMany({ where: { examen_id: examen.id, id: { notIn: idsConservados } }, data: { activo: false } });

    await tx.examen_adjuntos.deleteMany({ where: { examen_id: examen.id } });
    if (adjuntos.length) {
      await tx.examen_adjuntos.createMany({
        data: adjuntos.map((a) => ({ examen_id: examen.id, desde_orden: a.desde, hasta_orden: a.hasta, tipo: a.tipo, nombre: a.nombre, url: a.url })),
      });
    }
  });

  revalidatePath("/panel/reactivos");
  revalidatePath("/panel/fases");
  revalidatePath("/portal/practica");
  revalidatePath("/portal/fases");
  return { ok: examenId ? "Examen actualizado" : `Examen guardado (${preguntas.length} preguntas)` };
}

/** Cambia solo en qué modalidad(es) aparece un examen (sin tocar preguntas ni
 *  adjuntos) — para el switch rápido de la tarjeta, sin abrir el asistente completo. */
export async function examenModalidadesAccion(examenId: number, cursoIds: number[]): Promise<Resultado> {
  await requiereModulo("reactivos");
  const limpios = cursoIds.filter((n) => Number.isInteger(n) && n > 0);
  if (limpios.length === 0) return { error: "Elige al menos una modalidad donde mostrar el examen" };
  await prisma.$transaction([
    prisma.examen_cursos.deleteMany({ where: { examen_id: examenId } }),
    prisma.examen_cursos.createMany({ data: limpios.map((curso_id) => ({ examen_id: examenId, curso_id })) }),
  ]);
  revalidatePath("/panel/reactivos");
  revalidatePath("/panel/fases");
  revalidatePath("/portal/practica");
  revalidatePath("/portal/fases");
  return { ok: "Modalidades actualizadas" };
}

export async function examenActivoAccion(id: number, activo: boolean): Promise<Resultado> {
  await requiereModulo("reactivos");
  await prisma.$transaction([
    prisma.examenes.update({ where: { id }, data: { activo } }),
    prisma.reactivos.updateMany({ where: { examen_id: id }, data: { activo } }),
  ]);
  revalidatePath("/panel/reactivos");
  return { ok: activo ? "Examen activado" : "Examen desactivado" };
}

export async function examenBorrarAccion(id: number): Promise<Resultado> {
  await requiereModulo("reactivos");
  await prisma.reactivos.updateMany({ where: { examen_id: id }, data: { activo: false, examen_id: null } });
  await prisma.examenes.delete({ where: { id } });
  revalidatePath("/panel/reactivos");
  return { ok: "Examen eliminado" };
}

/** Sube una imagen, video o documento de apoyo para un rango de preguntas. */
export async function reactivoAdjuntoSubirAccion(fd: FormData): Promise<{ ok?: { nombre: string; url: string; tipo: string }; error?: string }> {
  await requiereModulo("reactivos");
  const archivo = fd.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elige un archivo válido" };
  if (archivo.size > MAX_ADJUNTO) return { error: "El archivo pesa más de 60 MB" };
  const ext = path.extname(archivo.name).toLowerCase();
  if (!EXT_PERMITIDAS.includes(ext)) return { error: `Tipo de archivo no permitido (${ext || "sin extensión"})` };
  const dir = path.join(dirImgPanel(), "reactivos");
  await mkdir(dir, { recursive: true });
  const base = path.basename(archivo.name, ext).replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 40) || "adjunto";
  const nombreArchivo = `${base}-${randomBytes(4).toString("hex")}${ext}`;
  try {
    await writeFile(path.join(dir, nombreArchivo), Buffer.from(await archivo.arrayBuffer()));
  } catch { return { error: "No pudimos guardar el archivo" }; }
  const tipo = ext === ".mp4" ? "video" : ext === ".pdf" ? "documento" : "imagen";
  return { ok: { nombre: archivo.name, url: `/panel/img/reactivos/${nombreArchivo}`, tipo } };
}

// "Explicar con IA" ahora vive en /api/reactivos/explicar-ia (streaming) —
// una Server Action no puede transmitir texto progresivo al cliente.

/* ── ETIQUETAS de exámenes (F2, 05-sep-2026): registrar, eliminar y asignar
 *    — permiten separar y filtrar exámenes en Reactivos y en Fases. ── */

export async function etiquetaCrearAccion(nombre: string): Promise<Resultado & { id?: number }> {
  await requiereModulo("reactivos");
  const limpio = nombre.trim().slice(0, 60);
  if (limpio.length < 2) return { error: "Escribe un nombre de al menos 2 caracteres" };
  try {
    const e = await prisma.etiquetas.create({ data: { nombre: limpio } });
    revalidatePath("/panel/reactivos");
    return { ok: `Etiqueta "${limpio}" registrada`, id: e.id };
  } catch {
    return { error: "Ya existe una etiqueta con ese nombre" };
  }
}

export async function etiquetaEliminarAccion(id: number): Promise<Resultado> {
  await requiereModulo("reactivos");
  // ON DELETE SET NULL: los exámenes que la usaban quedan sin etiqueta.
  await prisma.examenes.updateMany({ where: { etiqueta_id: id }, data: { etiqueta_id: null } });
  await prisma.etiquetas.delete({ where: { id } }).catch(() => {});
  revalidatePath("/panel/reactivos");
  return { ok: "Etiqueta eliminada (los exámenes que la usaban quedan sin etiqueta)" };
}

export async function examenEtiquetaAccion(examenId: number, etiquetaId: number | null): Promise<Resultado> {
  await requiereModulo("reactivos");
  await prisma.examenes.update({ where: { id: examenId }, data: { etiqueta_id: etiquetaId } });
  revalidatePath("/panel/reactivos");
  revalidatePath("/panel/fases");
  return { ok: etiquetaId ? "Etiqueta asignada" : "Etiqueta quitada" };
}
