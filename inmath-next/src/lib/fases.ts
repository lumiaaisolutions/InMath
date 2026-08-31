import { prisma } from "./db";
import { ahoraPared } from "./fechas";
import type { OpcionesReactivo, RespuestaDetalle, ResultadoIntento } from "./practica";

export type FaseRecurso = { id: number; tipo: string; titulo: string; url: string };
export type FaseExamenEstado = { examenId: number; titulo: string; aprobado: boolean; mejorPorcentaje: number | null };
export type FaseConEstado = {
  id: number;
  titulo: string;
  descripcion: string | null;
  porcentajeMinimo: number;
  desbloqueada: boolean;
  aprobada: boolean;
  recursos: FaseRecurso[];
  examenes: FaseExamenEstado[];
};

/** Lista las fases activas del curso con el estado de desbloqueo/aprobación
 *  para este alumno. La fase 1 siempre está desbloqueada; cada fase
 *  siguiente requiere que TODOS los exámenes de la fase anterior tengan un
 *  intento con porcentaje >= porcentaje_minimo de esa fase (avance secuencial). */
export async function listarFasesConEstado(alumnoId: number, cursoId: number): Promise<FaseConEstado[]> {
  const fases = await prisma.fases.findMany({
    where: { curso_id: cursoId, activo: true },
    orderBy: { orden: "asc" },
    include: {
      recursos: { orderBy: { orden: "asc" } },
      fase_examenes: { include: { examenes: { select: { id: true, titulo: true } } }, orderBy: { orden: "asc" } },
    },
  });
  if (fases.length === 0) return [];

  const intentos = await prisma.intentos_practica.findMany({
    where: { alumno_id: alumnoId, fase_id: { in: fases.map((f) => f.id) } },
    select: { fase_id: true, examen_id: true, porcentaje: true },
  });
  const mejorPor = new Map<string, number>();
  for (const it of intentos) {
    if (it.fase_id == null || it.examen_id == null) continue;
    const key = `${it.fase_id}:${it.examen_id}`;
    mejorPor.set(key, Math.max(mejorPor.get(key) ?? 0, it.porcentaje));
  }

  const out: FaseConEstado[] = [];
  let previaAprobada = true; // la fase 1 siempre parte desbloqueada
  for (const f of fases) {
    const examenes: FaseExamenEstado[] = f.fase_examenes.map((fe) => {
      const mejor = mejorPor.get(`${f.id}:${fe.examen_id}`) ?? null;
      return { examenId: fe.examen_id, titulo: fe.examenes.titulo, aprobado: mejor !== null && mejor >= f.porcentaje_minimo, mejorPorcentaje: mejor };
    });
    const aprobada = examenes.length === 0 || examenes.every((e) => e.aprobado);
    out.push({
      id: f.id,
      titulo: f.titulo,
      descripcion: f.descripcion,
      porcentajeMinimo: f.porcentaje_minimo,
      desbloqueada: previaAprobada,
      aprobada,
      recursos: f.recursos.map((r) => ({ id: r.id, tipo: r.tipo, titulo: r.titulo, url: r.url })),
      examenes,
    });
    previaAprobada = previaAprobada && aprobada;
  }
  return out;
}

/** Reactivos de un examen de una fase, EN ORDEN (no aleatorio, a diferencia
 *  de la práctica libre) — valida que el examen realmente pertenezca a esa
 *  fase antes de exponer nada. */
export async function reactivosDeFaseExamen(faseId: number, examenId: number) {
  const pertenece = await prisma.fase_examenes.findFirst({ where: { fase_id: faseId, examen_id: examenId } });
  if (!pertenece) return null;
  const filas = await prisma.reactivos.findMany({
    where: { examen_id: examenId, activo: true },
    orderBy: { orden: "asc" },
    select: { id: true, tema: true, enunciado: true, opciones: true },
  });
  return filas.map((f) => ({ id: f.id, tema: f.tema, enunciado: f.enunciado, opciones: f.opciones as OpcionesReactivo }));
}

/** Igual que calificarIntento (practica.ts) pero etiquetado con fase_id/examen_id
 *  y con doble candado: la fase debe estar desbloqueada y el examen debe
 *  pertenecer a ella — defensa contra manipular el payload para saltarse el orden. */
export async function calificarIntentoFase(
  alumnoId: number,
  cursoId: number,
  faseId: number,
  examenId: number,
  respuestas: { reactivo_id: number; respuesta_dada: number | null }[],
): Promise<ResultadoIntento | { error: string }> {
  const estado = await listarFasesConEstado(alumnoId, cursoId);
  const fase = estado.find((f) => f.id === faseId);
  if (!fase || !fase.desbloqueada) return { error: "Esta fase todavía no está desbloqueada." };
  if (!fase.examenes.some((e) => e.examenId === examenId)) return { error: "Ese examen no pertenece a esta fase." };

  const ids = respuestas.map((r) => r.reactivo_id);
  const reactivos = await prisma.reactivos.findMany({ where: { id: { in: ids }, examen_id: examenId } });
  const porId = new Map(reactivos.map((r) => [r.id, r]));

  const detalle: RespuestaDetalle[] = [];
  let correctas = 0;
  for (const r of respuestas) {
    const reactivo = porId.get(r.reactivo_id);
    if (!reactivo) continue;
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
      alumno_id: alumnoId, curso_id: cursoId, examen_id: examenId, fase_id: faseId,
      total_preguntas: total, correctas, porcentaje,
      respuestas: detalle as never,
      creado_en: ahoraPared(),
    },
  });

  return { intentoId: intento.id, total, correctas, porcentaje, detalle, aprobado: porcentaje >= fase.porcentajeMinimo };
}
