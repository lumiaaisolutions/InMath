import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requiereAlumno } from "@/lib/portal/sesion";
import { tienePagoConfirmado } from "@/lib/portal/auth";
import { listarFasesConEstado } from "@/lib/fases";
import { ClienteFases } from "./ClienteFases";

export const metadata: Metadata = { title: "Fases — Portal InMath" };
export const dynamic = "force-dynamic";

export default async function FasesPage() {
  const alumno = await requiereAlumno();
  if (!(await tienePagoConfirmado(alumno.prospecto_id))) redirect("/portal");

  const fases = await listarFasesConEstado(alumno.id, alumno.curso_id);

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
