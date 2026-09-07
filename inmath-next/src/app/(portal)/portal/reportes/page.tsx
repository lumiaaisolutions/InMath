import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { Icono } from "@/components/Icono";
import { redirect } from "next/navigation";
import { requiereAlumno } from "@/lib/portal/sesion";
import { tienePagoConfirmado } from "@/lib/portal/auth";
import { calcularAvance } from "@/lib/avance";
import { historialDeAlumno } from "@/lib/practica";
import { AvanceCard } from "../AvanceCard";

export const metadata: Metadata = { title: "Reportes — Portal InMath" };
export const dynamic = "force-dynamic";

const MESES = ["", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function periodo(ini: Date, fin: Date): string {
  return `${ini.getUTCDate()} ${MESES[ini.getUTCMonth() + 1]} — ${fin.getUTCDate()} ${MESES[fin.getUTCMonth() + 1]} ${fin.getUTCFullYear()}`;
}

export default async function ReportesPage() {
  const alumno = await requiereAlumno();
  if (!(await tienePagoConfirmado(alumno.prospecto_id))) redirect("/portal");
  const [reportes, avance, historial] = await Promise.all([
    prisma.reportes_generados.findMany({ where: { alumno_id: alumno.id }, orderBy: { periodo_inicio: "desc" }, take: 50 }),
    calcularAvance(alumno.id, alumno.curso_id),
    historialDeAlumno(alumno.id),
  ]);

  return (
    <section className="pt-panel">
      <div className="pt-wrap">
        <header className="pt-head pt-rev" style={{ ["--d" as string]: "0ms" }}>
          <div className="pt-head-id">
            <span className="pt-kicker">Tu avance</span>
            <h1>Reportes</h1>
            <p className="pt-head-sub">Cada semana generamos un reporte con tu avance del curso.</p>
          </div>
        </header>

        <div className="pt-rev" style={{ ["--d" as string]: "60ms", marginBottom: 18 }}>
          <AvanceCard avance={avance} historial={historial.map((h) => ({
            id: h.id, etiqueta: h.examenTitulo ?? h.tema ?? "Práctica",
            fecha: `${String(h.fecha.getUTCDate()).padStart(2,"0")}/${String(h.fecha.getUTCMonth()+1).padStart(2,"0")}/${h.fecha.getUTCFullYear()}`,
            porcentaje: h.porcentaje, correctas: h.correctas, total: h.total,
          }))} />
        </div>

        <h2 className="pt-sub-tit pt-rev" style={{ ["--d" as string]: "90ms" }}>Reportes semanales en PDF</h2>
        {reportes.length === 0 ? (
          <div className="pt-vacio pt-rev" style={{ ["--d" as string]: "100ms" }}>
            Aún no hay reportes semanales en PDF. Mientras tanto, arriba ves tu avance actualizado en vivo.
          </div>
        ) : (
          <ul className="pt-lista pt-rev" style={{ ["--d" as string]: "80ms" }}>
            {reportes.map((r) => (
              <li key={r.id}>
                <span className="pt-lista-tx"><span className="pt-lista-ic"><Icono n="file" /></span> Semana {periodo(r.periodo_inicio, r.periodo_fin)}</span>
                <a className="pt-lista-accion" href={`/portal/reporte/${r.id}`} target="_blank" rel="noopener">
                  <Icono n="download" /> Descargar
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
