import { prisma } from "./db";
import { ahoraPared } from "./fechas";

export type OpcionesReactivo = string[];

/** Imagen/video/documento de apoyo — material de lectura compartido por un
 *  rango de preguntas consecutivas (p. ej. un texto de comprensión lectora). */
export type LecturaAdjunto = { id: number; tipo: string; nombre: string; url: string };

export type ReactivoParaAlumno = {
  id: number;
  tema: string | null;
  enunciado: string;
  opciones: OpcionesReactivo;
  /** Adjunto propio de esta pregunta (p. ej. un diagrama), distinto de la lectura compartida. */
  adjuntoUrl: string | null;
  adjuntoTipo: string | null;
  /** Material de lectura del examen que cubre esta pregunta, si aplica. */
  lectura: LecturaAdjunto | null;
};

type FilaReactivoConOrden = {
  id: number; tema: string | null; enunciado: string; opciones: unknown;
  orden: number | null; examen_id: number | null;
  adjunto_url: string | null; adjunto_tipo: string | null;
};

/** Cruza cada reactivo con el material de lectura de su examen (si lo hay):
 *  el `orden` guardado en el reactivo (0-indexado) + 1 debe caer dentro del
 *  rango `desde_orden..hasta_orden` del adjunto, dentro del MISMO examen. */
export async function adjuntarLecturas(filas: FilaReactivoConOrden[]): Promise<ReactivoParaAlumno[]> {
  const examenIds = [...new Set(filas.map((f) => f.examen_id).filter((id): id is number => id !== null))];
  const adjuntos = examenIds.length
    ? await prisma.examen_adjuntos.findMany({ where: { examen_id: { in: examenIds } } })
    : [];
  return filas.map((f) => {
    const posicion = f.orden !== null ? f.orden + 1 : null;
    const a = posicion !== null && f.examen_id !== null
      ? adjuntos.find((x) => x.examen_id === f.examen_id && x.desde_orden <= posicion && posicion <= x.hasta_orden)
      : undefined;
    return {
      id: f.id, tema: f.tema, enunciado: f.enunciado, opciones: f.opciones as OpcionesReactivo,
      adjuntoUrl: f.adjunto_url, adjuntoTipo: f.adjunto_tipo,
      lectura: a ? { id: a.id, tipo: a.tipo, nombre: a.nombre, url: a.url } : null,
    };
  });
}

const filtroCurso = (cursoId: number) => ({
  OR: [
    { examen_id: null, curso_id: cursoId },
    { examenes: { examen_cursos: { some: { curso_id: cursoId } } } },
  ],
});

/** Elige hasta `cantidad` reactivos activos del curso — filtrados por tema o
 *  por un examen específico (no ambos a la vez). Si viene de un examen y ese
 *  examen tiene `orden_aleatorio=false`, respeta el orden que definió el
 *  admin; si no, se baraja (Fisher-Yates, sin sesgo) — pero por GRUPOS: una
 *  lectura y las preguntas que la comparten viajan juntas, nunca se separan
 *  ni la lectura queda "suelta" en medio del barajeo. */
export async function elegirReactivos(
  cursoId: number,
  tema: string | null,
  cantidad: number,
  examenId: number | null = null,
): Promise<ReactivoParaAlumno[]> {
  let ordenFijo = false;
  if (examenId) {
    const examen = await prisma.examenes.findFirst({
      where: { id: examenId, activo: true, examen_cursos: { some: { curso_id: cursoId } } },
      select: { orden_aleatorio: true },
    });
    if (!examen) return [];
    ordenFijo = !examen.orden_aleatorio;
  }

  const filas = await prisma.reactivos.findMany({
    where: {
      activo: true,
      ...(tema ? { tema } : {}),
      ...(examenId ? { examen_id: examenId } : filtroCurso(cursoId)),
    },
    select: {
      id: true, tema: true, enunciado: true, opciones: true, orden: true,
      examen_id: true, adjunto_url: true, adjunto_tipo: true,
    },
    // Orden ascendente SIEMPRE (incluso si luego se baraja): así, dentro de
    // cada grupo de lectura compartida, las preguntas quedan en su secuencia
    // original (1, 2, 3…) en vez de en el orden crudo en que las devuelva la BD.
    orderBy: { orden: "asc" },
  });

  const reactivos = await adjuntarLecturas(filas);
  if (ordenFijo) return reactivos.slice(0, cantidad);

  // Agrupa: cada lectura compartida con sus preguntas es un grupo; cada
  // pregunta sin lectura es su propio grupo de 1. Se baraja el ORDEN DE LOS
  // GRUPOS (no las preguntas sueltas dentro de un grupo).
  const grupos: ReactivoParaAlumno[][] = [];
  const porLectura = new Map<number, ReactivoParaAlumno[]>();
  for (const r of reactivos) {
    if (r.lectura) {
      const existente = porLectura.get(r.lectura.id);
      if (existente) { existente.push(r); continue; }
      const nuevo = [r];
      porLectura.set(r.lectura.id, nuevo);
      grupos.push(nuevo);
    } else {
      grupos.push([r]);
    }
  }
  // Fisher-Yates sobre los grupos: orden aleatorio sin sesgo.
  for (let i = grupos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [grupos[i], grupos[j]] = [grupos[j], grupos[i]];
  }
  return grupos.flat().slice(0, cantidad);
}

/** Lista de temas distintos con reactivos activos en el curso (para el filtro). */
export async function temasDisponibles(cursoId: number): Promise<string[]> {
  const filas = await prisma.reactivos.findMany({
    where: { activo: true, tema: { not: null }, ...filtroCurso(cursoId) },
    select: { tema: true }, distinct: ["tema"],
  });
  return filas.map((f) => f.tema!).sort((a, b) => a.localeCompare(b, "es"));
}

export type ExamenDisponible = { id: number; titulo: string; totalPreguntas: number };

/** Exámenes activos del curso con al menos una pregunta — para que el alumno
 *  elija un examen específico en vez de solo un tema en Práctica. */
export async function examenesDisponibles(cursoId: number): Promise<ExamenDisponible[]> {
  const filas = await prisma.examenes.findMany({
    where: { activo: true, examen_cursos: { some: { curso_id: cursoId } } },
    select: { id: true, titulo: true, _count: { select: { reactivos: { where: { activo: true } } } } },
    orderBy: { titulo: "asc" },
  });
  return filas.filter((f) => f._count.reactivos > 0).map((f) => ({ id: f.id, titulo: f.titulo, totalPreguntas: f._count.reactivos }));
}

/** Cuántas preguntas activas hay por tema (más el total del curso bajo la
 *  llave `null`) — para armar los botones de cantidad según lo que de verdad
 *  existe en cada caso, en vez de presets fijos que a veces no aplican. */
export async function conteosPorTema(cursoId: number): Promise<Record<string, number>> {
  const [porTema, total] = await Promise.all([
    prisma.reactivos.groupBy({ by: ["tema"], where: { activo: true, tema: { not: null }, ...filtroCurso(cursoId) }, _count: true }),
    prisma.reactivos.count({ where: { activo: true, ...filtroCurso(cursoId) } }),
  ]);
  const mapa: Record<string, number> = { __todos__: total };
  for (const f of porTema) if (f.tema) mapa[f.tema] = f._count;
  return mapa;
}

export type RespuestaDetalle = {
  reactivo_id: number;
  enunciado: string;
  opciones: OpcionesReactivo;
  respuesta_dada: number | null;
  respuesta_correcta: number;
  correcta: boolean;
  explicacion: string | null;
  adjuntoUrl: string | null;
  adjuntoTipo: string | null;
  lectura: LecturaAdjunto | null;
};

export type ResultadoIntento = {
  intentoId: number;
  total: number;
  correctas: number;
  porcentaje: number;
  detalle: RespuestaDetalle[];
  /** Solo tiene sentido cuando el intento viene de un examen con % mínimo definido. */
  aprobado: boolean | null;
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
  examenId: number | null = null,
): Promise<ResultadoIntento> {
  const ids = respuestas.map((r) => r.reactivo_id);
  const [reactivos, examen] = await Promise.all([
    prisma.reactivos.findMany({
      where: { id: { in: ids }, ...(examenId ? { examen_id: examenId } : filtroCurso(cursoId)) },
    }),
    examenId ? prisma.examenes.findUnique({ where: { id: examenId }, select: { porcentaje_minimo: true } }) : null,
  ]);
  const porId = new Map(reactivos.map((r) => [r.id, r]));
  const lecturaPorId = new Map((await adjuntarLecturas(reactivos)).map((r) => [r.id, r]));

  const detalle: RespuestaDetalle[] = [];
  let correctas = 0;
  for (const r of respuestas) {
    const reactivo = porId.get(r.reactivo_id);
    if (!reactivo) continue; // ignora ids que no pertenecen al curso (payload manipulado)
    const extra = lecturaPorId.get(reactivo.id);
    const correcta = r.respuesta_dada !== null && r.respuesta_dada === reactivo.respuesta_correcta;
    if (correcta) correctas++;
    detalle.push({
      reactivo_id: reactivo.id, enunciado: reactivo.enunciado, opciones: reactivo.opciones as OpcionesReactivo,
      respuesta_dada: r.respuesta_dada, respuesta_correcta: reactivo.respuesta_correcta,
      correcta, explicacion: reactivo.explicacion,
      adjuntoUrl: extra?.adjuntoUrl ?? null, adjuntoTipo: extra?.adjuntoTipo ?? null, lectura: extra?.lectura ?? null,
    });
  }

  const total = detalle.length;
  const porcentaje = total > 0 ? Math.round((correctas / total) * 100) : 0;

  const intento = await prisma.intentos_practica.create({
    data: {
      alumno_id: alumnoId, curso_id: cursoId, tema, examen_id: examenId,
      total_preguntas: total, correctas, porcentaje,
      respuestas: detalle as never,
      creado_en: ahoraPared(),
    },
  });

  return { intentoId: intento.id, total, correctas, porcentaje, detalle, aprobado: examen ? porcentaje >= examen.porcentaje_minimo : null };
}

export type IntentoHistorial = {
  id: number; tema: string | null; examenTitulo: string | null; total: number; correctas: number; porcentaje: number; fecha: Date;
};

export async function historialDeAlumno(alumnoId: number, limite = 20): Promise<IntentoHistorial[]> {
  const filas = await prisma.intentos_practica.findMany({
    where: { alumno_id: alumnoId }, orderBy: { creado_en: "desc" }, take: limite,
    include: { examenes: { select: { titulo: true } } },
  });
  return filas.map((f) => ({
    id: f.id, tema: f.tema, examenTitulo: f.examenes?.titulo ?? null,
    total: f.total_preguntas, correctas: f.correctas, porcentaje: f.porcentaje, fecha: f.creado_en,
  }));
}
