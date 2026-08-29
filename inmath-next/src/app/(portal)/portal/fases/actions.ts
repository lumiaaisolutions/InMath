"use server";
import { requiereAlumno } from "@/lib/portal/sesion";
import { tienePagoConfirmado } from "@/lib/portal/auth";
import { reactivosDeFaseExamen, calificarIntentoFase, listarFasesConEstado, type FaseConEstado } from "@/lib/fases";
import type { ReactivoParaAlumno, ResultadoIntento } from "@/lib/practica";

export type EstadoIniciarFase = { error?: string; reactivos?: ReactivoParaAlumno[] };

/** Arranca el examen de una fase: reactivos EN ORDEN (no aleatorio), y valida
 *  que la fase esté desbloqueada y el examen le pertenezca. */
export async function iniciarExamenFaseAccion(_prev: EstadoIniciarFase, fd: FormData): Promise<EstadoIniciarFase> {
  const alumno = await requiereAlumno();
  if (!(await tienePagoConfirmado(alumno.prospecto_id))) return { error: "Completa tu pago para acceder a las fases." };

  const faseId = parseInt(String(fd.get("fase_id") ?? "0"), 10);
  const examenId = parseInt(String(fd.get("examen_id") ?? "0"), 10);
  if (faseId < 1 || examenId < 1) return { error: "Examen inválido." };

  const reactivos = await reactivosDeFaseExamen(faseId, examenId);
  if (reactivos === null) return { error: "Ese examen no pertenece a esta fase." };
  if (reactivos.length === 0) return { error: "Este examen todavía no tiene preguntas." };
  return { reactivos };
}

export type EstadoCalificarFase = { error?: string; resultado?: ResultadoIntento; fases?: FaseConEstado[] };

export async function calificarExamenFaseAccion(_prev: EstadoCalificarFase, fd: FormData): Promise<EstadoCalificarFase> {
  const alumno = await requiereAlumno();
  if (!(await tienePagoConfirmado(alumno.prospecto_id))) return { error: "Completa tu pago para acceder a las fases." };

  const faseId = parseInt(String(fd.get("fase_id") ?? "0"), 10);
  const examenId = parseInt(String(fd.get("examen_id") ?? "0"), 10);
  let respuestas: { reactivo_id: number; respuesta_dada: number | null }[];
  try {
    respuestas = JSON.parse(String(fd.get("respuestas") ?? "[]"));
  } catch {
    return { error: "No se pudieron leer tus respuestas." };
  }
  if (!Array.isArray(respuestas) || respuestas.length === 0) return { error: "No hay respuestas que calificar." };

  const resultado = await calificarIntentoFase(alumno.id, alumno.curso_id, faseId, examenId, respuestas);
  if ("error" in resultado) return { error: resultado.error };

  const fases = await listarFasesConEstado(alumno.id, alumno.curso_id);
  return { resultado, fases };
}
