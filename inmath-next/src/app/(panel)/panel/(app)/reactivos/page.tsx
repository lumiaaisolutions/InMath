import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requiereModulo } from "@/lib/panel/sesion";
import { ListaReactivos } from "./ClienteReactivos";

export const metadata: Metadata = { title: "Reactivos — Inmath CRM" };
export const dynamic = "force-dynamic";

export default async function ReactivosPage() {
  await requiereModulo("reactivos");
  const [reactivos, cursos] = await Promise.all([
    prisma.reactivos.findMany({ orderBy: { id: "desc" }, include: { cursos: { select: { nombre: true } } } }),
    prisma.cursos.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { id: "asc" } }),
  ]);

  return (
    <>
      <div className="cabecera">
        <div>
          <h1>Reactivos de práctica</h1>
          <div className="sub">{reactivos.length} en total · el alumno los resuelve en su portal, en "Práctica"</div>
        </div>
      </div>
      <ListaReactivos
        inicial={reactivos.map((r) => ({
          id: r.id, curso_id: r.curso_id, curso_nombre: r.cursos.nombre, tema: r.tema,
          enunciado: r.enunciado, opciones: r.opciones as string[], respuesta_correcta: r.respuesta_correcta,
          explicacion: r.explicacion, activo: r.activo,
        }))}
        cursos={cursos}
      />
    </>
  );
}
