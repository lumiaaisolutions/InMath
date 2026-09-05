import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requiereModulo } from "@/lib/panel/sesion";
import { ClienteFases } from "./ClienteFases";

export const metadata: Metadata = { title: "Fases del curso — Inmath CRM" };
export const dynamic = "force-dynamic";

export default async function FasesPage() {
  await requiereModulo("reactivos");
  const [fases, examenes, cursos, etiquetas] = await Promise.all([
    prisma.fases.findMany({
      orderBy: [{ curso_id: "asc" }, { orden: "asc" }],
      include: {
        cursos: { select: { nombre: true } },
        recursos: { orderBy: { orden: "asc" } },
        fase_examenes: { include: { examenes: { select: { id: true, titulo: true } } }, orderBy: { orden: "asc" } },
      },
    }),
    prisma.examenes.findMany({
      where: { activo: true }, orderBy: { id: "desc" },
      select: { id: true, titulo: true, etiqueta_id: true, examen_cursos: { select: { curso_id: true } } },
    }),
    prisma.cursos.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { id: "asc" } }),
    prisma.etiquetas.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  return (
    <>
      <div className="cabecera">
        <div>
          <h1>Fases del curso</h1>
          <div className="sub">Ruta de aprendizaje del alumno: videos, materiales y el examen que debe aprobar para pasar a la siguiente fase.</div>
        </div>
      </div>
      <ClienteFases
        fases={fases.map((f) => ({
          id: f.id, curso_id: f.curso_id, curso_nombre: f.cursos.nombre, titulo: f.titulo, descripcion: f.descripcion,
          orden: f.orden, porcentaje_minimo: f.porcentaje_minimo, activo: f.activo,
          recursos: f.recursos.map((r) => ({ id: r.id, tipo: r.tipo, titulo: r.titulo, url: r.url })),
          examenes: f.fase_examenes.map((fe) => ({ examenId: fe.examen_id, titulo: fe.examenes.titulo })),
        }))}
        examenes={examenes.map((e) => ({ id: e.id, titulo: e.titulo, etiquetaId: e.etiqueta_id ?? null, cursoIds: e.examen_cursos.map((ec) => ec.curso_id) }))}
        etiquetas={etiquetas.map((e) => ({ id: e.id, nombre: e.nombre }))}
        cursos={cursos}
      />
    </>
  );
}
