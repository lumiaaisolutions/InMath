import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requiereAlumno } from "@/lib/portal/sesion";
import { tienePagoConfirmado } from "@/lib/portal/auth";
import { temasDisponibles, examenesDisponibles, conteosPorTema, historialDeAlumno } from "@/lib/practica";
import { ClientePractica } from "./ClientePractica";

export const metadata: Metadata = { title: "Práctica — Portal InMath" };
export const dynamic = "force-dynamic";

export default async function PracticaPage() {
  const alumno = await requiereAlumno();
  if (!(await tienePagoConfirmado(alumno.prospecto_id))) redirect("/portal");

  const [temas, examenes, conteos, historial] = await Promise.all([
    temasDisponibles(alumno.curso_id),
    examenesDisponibles(alumno.curso_id),
    conteosPorTema(alumno.curso_id),
    historialDeAlumno(alumno.id),
  ]);

  return (
    <section className="pt-panel">
      <div className="pt-wrap">
        <header className="pt-head pt-rev" style={{ ["--d" as string]: "0ms" }}>
          <div className="pt-head-id">
            <span className="pt-kicker">Tu curso</span>
            <h1>Práctica de reactivos</h1>
            <p className="pt-head-sub">Resuelve preguntas de opción múltiple y mide tu avance.</p>
          </div>
        </header>
        <ClientePractica temas={temas} examenes={examenes} conteos={conteos} historialInicial={historial} />
      </div>
    </section>
  );
}
