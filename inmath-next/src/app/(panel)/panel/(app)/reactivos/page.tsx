import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requiereModulo } from "@/lib/panel/sesion";
import { ClienteReactivos } from "./ClienteReactivos";

export const metadata: Metadata = { title: "Reactivos — Inmath CRM" };
export const dynamic = "force-dynamic";

export default async function ReactivosPage() {
  await requiereModulo("reactivos");
  const [examenes, sueltos, cursos] = await Promise.all([
    prisma.examenes.findMany({
      orderBy: { id: "desc" },
      include: {
        examen_cursos: { include: { cursos: { select: { id: true, nombre: true } } } },
        reactivos: { orderBy: { orden: "asc" } },
        adjuntos: { orderBy: { desde_orden: "asc" } },
      },
    }),
    prisma.reactivos.findMany({ where: { examen_id: null }, orderBy: { id: "desc" }, include: { cursos: { select: { nombre: true } } } }),
    prisma.cursos.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { id: "asc" } }),
  ]);

  return (
    <>
      <div className="cabecera">
        <div>
          <h1>Reactivos</h1>
          <div className="sub">El alumno los resuelve en su portal, en &quot;Práctica&quot; — agrupados en exámenes o sueltos. Un examen es genérico: eliges en qué modalidad(es) aparece.</div>
        </div>
      </div>
      <ClienteReactivos
        examenes={examenes.map((e) => ({
          id: e.id, cursoIds: e.examen_cursos.map((ec) => ec.curso_id), cursoNombres: e.examen_cursos.map((ec) => ec.cursos.nombre), titulo: e.titulo, tema: e.tema, activo: e.activo,
          preguntas: e.reactivos.filter((r) => r.activo).map((r) => ({
            id: r.id, enunciado: r.enunciado, opciones: r.opciones as string[], correcta: r.respuesta_correcta, explicacion: r.explicacion ?? "",
          })),
          adjuntos: e.adjuntos.map((a) => ({ id: a.id, desde: a.desde_orden, hasta: a.hasta_orden, tipo: a.tipo, nombre: a.nombre, url: a.url })),
        }))}
        sueltos={sueltos.map((r) => ({
          id: r.id, curso_id: r.curso_id!, curso_nombre: r.cursos!.nombre, tema: r.tema,
          enunciado: r.enunciado, opciones: r.opciones as string[], respuesta_correcta: r.respuesta_correcta,
          explicacion: r.explicacion, activo: r.activo,
        }))}
        cursos={cursos}
      />
    </>
  );
}
