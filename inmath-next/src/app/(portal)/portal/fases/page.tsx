import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requiereAlumno } from "@/lib/portal/sesion";
import { tienePagoConfirmado } from "@/lib/portal/auth";
import { listarFasesConEstado } from "@/lib/fases";
import { ClienteFases } from "./ClienteFases";

export const metadata: Metadata = { title: "Fases — Portal InMath" };
export const dynamic = "force-dynamic";

export default async function FasesPage() {
  const alumno = await requiereAlumno();
  if (!(await tienePagoConfirmado(alumno.prospecto_id))) redirect("/portal");

  const [curso, fases] = await Promise.all([
    prisma.cursos.findUnique({
      where: { id: alumno.curso_id },
      select: { nombre: true, descripcion: true, imagen: true, duracion_semanas: true },
    }),
    listarFasesConEstado(alumno.id, alumno.curso_id),
  ]);

  return (
    <section className="pt-panel">
      <div className="pt-wrap">
        <header className="pt-head pt-rev" style={{ ["--d" as string]: "0ms" }}>
          <div className="pt-head-id">
            <span className="pt-kicker">Tu curso</span>
            <h1>Fases</h1>
            <p className="pt-head-sub">Tu ruta de aprendizaje: videos y materiales por fase, con un examen para pasar a la siguiente.</p>
          </div>
        </header>

        {curso && (
          <div className="fase-curso-hero pt-rev" style={{ ["--d" as string]: "40ms" }}>
            {curso.imagen && <img src={curso.imagen} alt="" />}
            <div>
              <b>{curso.nombre}</b>
              {curso.descripcion && <p>{curso.descripcion}</p>}
              {curso.duracion_semanas && <span>{curso.duracion_semanas} semanas de duración</span>}
            </div>
          </div>
        )}

        {fases.length === 0 ? (
          <div className="pt-vacio pt-rev" style={{ ["--d" as string]: "80ms" }}>
            Pronto encontrarás aquí la ruta de aprendizaje de tu curso.
          </div>
        ) : (
          <ClienteFases fasesIniciales={fases} />
        )}
      </div>
    </section>
  );
}
