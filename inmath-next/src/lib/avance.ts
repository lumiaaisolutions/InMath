import { prisma } from "./db";
import { examenesDisponibles } from "./practica";
import { listarFasesConEstado } from "./fases";

/**
 * AVANCE del alumno, calculado EN VIVO (no depende de la tabla
 * avance_alumnos, que nunca se llenaba). Combina dos componentes según lo
 * que exista para SU modalidad de curso:
 *
 *  1. EXÁMENES de práctica disponibles para su modalidad (examen_cursos):
 *     de los N exámenes, se toma el MEJOR porcentaje del alumno en cada uno
 *     (0 si no lo ha resuelto). Componente = promedio sobre N.
 *  2. FASES del curso: de las M fases activas, cuántas ha aprobado
 *     (reutiliza listarFasesConEstado, que evalúa sus exámenes en vivo).
 *
 * El AVANCE GLOBAL combina los componentes que existan: si hay ambos, el
 * promedio simple; si solo hay uno, ese; si no hay contenido, 0.
 */
export type Avance = {
  global: number;                        // 0-100
  examenes: { total: number; conIntento: number; porcentaje: number } | null;
  fases: { total: number; aprobadas: number; porcentaje: number } | null;
  hayContenido: boolean;
};

export async function calcularAvance(alumnoId: number, cursoId: number): Promise<Avance> {
  const [examenes, mejores, fases] = await Promise.all([
    examenesDisponibles(cursoId),
    // Mejor porcentaje por examen resuelto por el alumno.
    prisma.intentos_practica.groupBy({
      by: ["examen_id"],
      where: { alumno_id: alumnoId, examen_id: { not: null } },
      _max: { porcentaje: true },
    }),
    listarFasesConEstado(alumnoId, cursoId),
  ]);

  // ── Componente exámenes ──
  let compExamenes: Avance["examenes"] = null;
  if (examenes.length > 0) {
    const mejorPorExamen = new Map(mejores.map((m) => [m.examen_id, m._max.porcentaje ?? 0]));
    let suma = 0, conIntento = 0;
    for (const e of examenes) {
      const mejor = mejorPorExamen.get(e.id) ?? 0;
      suma += mejor;
      if (mejorPorExamen.has(e.id)) conIntento++;
    }
    compExamenes = { total: examenes.length, conIntento, porcentaje: Math.round(suma / examenes.length) };
  }

  // ── Componente fases ──
  const fasesActivas = fases; // listarFasesConEstado ya filtra activo:true
  let compFases: Avance["fases"] = null;
  if (fasesActivas.length > 0) {
    const aprobadas = fasesActivas.filter((f) => f.aprobada).length;
    compFases = { total: fasesActivas.length, aprobadas, porcentaje: Math.round((aprobadas / fasesActivas.length) * 100) };
  }

  // ── Global ──
  const partes = [compExamenes?.porcentaje, compFases?.porcentaje].filter((x): x is number => x != null);
  const global = partes.length ? Math.round(partes.reduce((a, b) => a + b, 0) / partes.length) : 0;

  return { global, examenes: compExamenes, fases: compFases, hayContenido: partes.length > 0 };
}
