import { prisma } from "./db";
import { ahoraPared } from "./fechas";

export type OpcionesReactivo = string[];

export type ReactivoParaAlumno = {
  id: number;
  tema: string | null;
  enunciado: string;
  opciones: OpcionesReactivo;
};

/** Elige hasta `cantidad` reactivos activos del curso (y tema, si se filtra),
 *  en orden aleatorio — sin exponer la respuesta correcta al alumno. */
export async function elegirReactivos(
  cursoId: number,
  tema: string | null,
  cantidad: number,
): Promise<ReactivoParaAlumno[]> {
  const filas = await prisma.reactivos.findMany({
    where: {
      activo: true,
      ...(tema ? { tema } : {}),
      OR: [
        { examen_id: null, curso_id: cursoId },
        { examenes: { examen_cursos: { some: { curso_id: cursoId } } } },
      ],
    },
    select: { id: true, tema: true, enunciado: true, opciones: true },
  });
  // Fisher-Yates: orden aleatorio sin sesgo, luego se recorta a `cantidad`.
  for (let i = filas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filas[i], filas[j]] = [filas[j], filas[i]];
  }
  return filas.slice(0, cantidad).map((f) => ({
    id: f.id, tema: f.tema, enunciado: f.enunciado, opciones: f.opciones as OpcionesReactivo,
  }));
}

/** Lista de temas distintos con reactivos activos en el curso (para el filtro). */
export async function temasDisponibles(cursoId: number): Promise<string[]> {
  const filas = await prisma.reactivos.findMany({
    where: {
      activo: true, tema: { not: null },
      OR: [
        { examen_id: null, curso_id: cursoId },
        { examenes: { examen_cursos: { some: { curso_id: cursoId } } } },
      ],
    },
    select: { tema: true }, distinct: ["tema"],
  });
  return filas.map((f) => f.tema!).sort((a, b) => a.localeCompare(b, "es"));
}

export type RespuestaDetalle = {
  reactivo_id: number;
  enunciado: string;
  opciones: OpcionesReactivo;
  respuesta_dada: number | null;
  respuesta_correcta: number;
  correcta: boolean;
  explicacion: string | null;
};

export type ResultadoIntento = {
  intentoId: number;
  total: number;
  correctas: number;
  porcentaje: number;
  detalle: RespuestaDetalle[];
};

/**
 * Motor de calificación automática: SIEMPRE recalcula contra la respuesta
 * correcta guardada en `reactivos` — nunca confía en un puntaje calculado por
 * el cliente. Persiste el intento (con detalle) para el historial.
 */
export async function calificarIntento(
  alumnoId: number,
  cursoId: number,
  tema: string | null,
  respuestas: { reactivo_id: number; respuesta_dada: number | null }[],
): Promise<ResultadoIntento> {
  const ids = respuestas.map((r) => r.reactivo_id);
  const reactivos = await prisma.reactivos.findMany({
    where: {
      id: { in: ids },
      OR: [
        { examen_id: null, curso_id: cursoId },
        { examenes: { examen_cursos: { some: { curso_id: cursoId } } } },
      ],
    },
  });
  const porId = new Map(reactivos.map((r) => [r.id, r]));

  const detalle: RespuestaDetalle[] = [];
  let correctas = 0;
  for (const r of respuestas) {
    const reactivo = porId.get(r.reactivo_id);
    if (!reactivo) continue; // ignora ids que no pertenecen al curso (payload manipulado)
    const correcta = r.respuesta_dada !== null && r.respuesta_dada === reactivo.respuesta_correcta;
    if (correcta) correctas++;
    detalle.push({
      reactivo_id: reactivo.id, enunciado: reactivo.enunciado, opciones: reactivo.opciones as OpcionesReactivo,
      respuesta_dada: r.respuesta_dada, respuesta_correcta: reactivo.respuesta_correcta,
      correcta, explicacion: reactivo.explicacion,
    });
  }

  const total = detalle.length;
  const porcentaje = total > 0 ? Math.round((correctas / total) * 100) : 0;

  const intento = await prisma.intentos_practica.create({
    data: {
      alumno_id: alumnoId, curso_id: cursoId, tema,
      total_preguntas: total, correctas, porcentaje,
      respuestas: detalle as never,
      creado_en: ahoraPared(),
    },
  });

  return { intentoId: intento.id, total, correctas, porcentaje, detalle };
}

export type IntentoHistorial = {
  id: number; tema: string | null; total: number; correctas: number; porcentaje: number; fecha: Date;
};

export async function historialDeAlumno(alumnoId: number, limite = 20): Promise<IntentoHistorial[]> {
  const filas = await prisma.intentos_practica.findMany({
    where: { alumno_id: alumnoId }, orderBy: { creado_en: "desc" }, take: limite,
  });
  return filas.map((f) => ({
    id: f.id, tema: f.tema, total: f.total_preguntas, correctas: f.correctas, porcentaje: f.porcentaje, fecha: f.creado_en,
  }));
}
