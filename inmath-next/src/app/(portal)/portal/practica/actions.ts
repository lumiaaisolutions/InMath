"use server";
import { requiereAlumno } from "@/lib/portal/sesion";
import { tienePagoConfirmado } from "@/lib/portal/auth";
import { elegirReactivos, calificarIntento, type ReactivoParaAlumno, type ResultadoIntento } from "@/lib/practica";

export type EstadoIniciar = { error?: string; reactivos?: ReactivoParaAlumno[]; tema?: string | null; examenId?: number | null };

/** Fase 5.3 — arranca una sesión de práctica: elige N reactivos del curso del
 *  alumno, por tema o por un examen específico. `cantidad="todas"` trae el
 *  total disponible. No expone la respuesta correcta. */
export async function iniciarPracticaAccion(_prev: EstadoIniciar, fd: FormData): Promise<EstadoIniciar> {
  const alumno = await requiereAlumno();
  if (!(await tienePagoConfirmado(alumno.prospecto_id))) return { error: "Completa tu pago para practicar." };

  const tema = String(fd.get("tema") ?? "").trim() || null;
  const examenIdRaw = parseInt(String(fd.get("examen_id") ?? "0"), 10);
  const examenId = examenIdRaw > 0 ? examenIdRaw : null;
  const cantidadRaw = String(fd.get("cantidad") ?? "10");
  const cantidad = cantidadRaw === "todas" ? 500 : Math.min(Math.max(parseInt(cantidadRaw, 10) || 10, 1), 500);

  const reactivos = await elegirReactivos(alumno.curso_id, examenId ? null : tema, cantidad, examenId);
  if (reactivos.length === 0) return { error: examenId ? "Ese examen no tiene preguntas disponibles." : "Aún no hay reactivos disponibles para ese tema." };
  return { reactivos, tema: examenId ? null : tema, examenId };
}

export type EstadoCalificar = { error?: string; resultado?: ResultadoIntento };

/** Fase 5.2 — motor de calificación automática: recalcula todo en el servidor. */
export async function calificarPracticaAccion(_prev: EstadoCalificar, fd: FormData): Promise<EstadoCalificar> {
  const alumno = await requiereAlumno();
  if (!(await tienePagoConfirmado(alumno.prospecto_id))) return { error: "Completa tu pago para practicar." };

  const tema = String(fd.get("tema") ?? "").trim() || null;
  const examenIdRaw = parseInt(String(fd.get("examen_id") ?? "0"), 10);
  const examenId = examenIdRaw > 0 ? examenIdRaw : null;
  let respuestas: { reactivo_id: number; respuesta_dada: number | null }[];
  try {
    respuestas = JSON.parse(String(fd.get("respuestas") ?? "[]"));
  } catch {
    return { error: "No se pudieron leer tus respuestas." };
  }
  if (!Array.isArray(respuestas) || respuestas.length === 0) return { error: "No hay respuestas que calificar." };

  const resultado = await calificarIntento(alumno.id, alumno.curso_id, tema, respuestas, examenId);
  return { resultado };
}
