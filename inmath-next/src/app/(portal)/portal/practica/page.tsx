import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requiereAlumno } from "@/lib/portal/sesion";
import { mediaAlumno } from "@/lib/portal/media";
import { tienePagoConfirmado } from "@/lib/portal/auth";
import { temasDisponibles, examenesDisponibles, conteosPorTema, historialDeAlumno } from "@/lib/practica";
import { ClientePractica } from "./ClientePractica";
import { calcularAvance } from "@/lib/avance";
import { AvanceCard } from "../AvanceCard";

export const metadata: Metadata = { title: "Práctica — Portal InMath" };
export const dynamic = "force-dynamic";

export default async function PracticaPage() {
  const alumno = await requiereAlumno();
  if (!(await tienePagoConfirmado(alumno.prospecto_id))) redirect("/portal");

  const [temas, examenes, conteos, historial, avance] = await Promise.all([
    temasDisponibles(alumno.curso_id),
    examenesDisponibles(alumno.curso_id),
    conteosPorTema(alumno.curso_id),
    historialDeAlumno(alumno.id),
    calcularAvance(alumno.id, alumno.curso_id),
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
        <div className="pt-rev" style={{ ["--d" as string]: "40ms", marginBottom: 18 }}>
          <AvanceCard avance={avance} metricas={{ diasContigo: Math.max(0, Math.floor((Date.now() - alumno.inscrito_en.getTime()) / 86400_000)) }} historial={historial.map((h) => ({
            id: h.id, etiqueta: h.examenTitulo ?? h.tema ?? "Práctica",
            fecha: `${String(h.fecha.getUTCDate()).padStart(2,"0")}/${String(h.fecha.getUTCMonth()+1).padStart(2,"0")}/${h.fecha.getUTCFullYear()}`,
            porcentaje: h.porcentaje, correctas: h.correctas, total: h.total,
          }))} />
        </div>
        <ClientePractica temas={temas} examenes={examenes} conteos={conteos} historialInicial={historial} avatarUrl={(await mediaAlumno(alumno.id)).avatar} nombre={alumno.nombre} />
      </div>
    </section>
  );
}
