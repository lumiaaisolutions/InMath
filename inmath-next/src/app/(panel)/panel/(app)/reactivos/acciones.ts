"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requiereModulo } from "@/lib/panel/sesion";

export type Resultado = { ok?: string; error?: string };

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

/** Fase 5.1 — carga de preguntas (admin). */
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
