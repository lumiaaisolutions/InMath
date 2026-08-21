import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { Icono } from "@/components/Icono";
import { redirect } from "next/navigation";
import { requiereAlumno } from "@/lib/portal/sesion";
import { tienePagoConfirmado } from "@/lib/portal/auth";

export const metadata: Metadata = { title: "Reportes — Portal InMath" };
export const dynamic = "force-dynamic";

const MESES = ["", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function periodo(ini: Date, fin: Date): string {
  return `${ini.getUTCDate()} ${MESES[ini.getUTCMonth() + 1]} — ${fin.getUTCDate()} ${MESES[fin.getUTCMonth() + 1]} ${fin.getUTCFullYear()}`;
}

export default async function ReportesPage() {
  const alumno = await requiereAlumno();
  if (!(await tienePagoConfirmado(alumno.prospecto_id))) redirect("/portal");
  const reportes = await prisma.reportes_generados.findMany({
    where: { alumno_id: alumno.id },
    orderBy: { periodo_inicio: "desc" },
    take: 50,
  });

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

        {reportes.length === 0 ? (
          <div className="pt-vacio pt-rev" style={{ ["--d" as string]: "80ms" }}>
            Aún no hay reportes. En cuanto tengamos tu primer reporte, aparecerá aquí.
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
