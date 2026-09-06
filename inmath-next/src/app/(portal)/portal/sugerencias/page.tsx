import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requiereAlumno } from "@/lib/portal/sesion";
import { RetroCard } from "../RetroCard";

export const metadata: Metadata = { title: "Sugerencias — Portal InMath" };
export const dynamic = "force-dynamic";

const fechaLarga = (d: Date) =>
  d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Apartado propio de retroalimentación: preguntas y recomendaciones del
 *  alumno + su historial con las RESPUESTAS del equipo. Disponible también
 *  con pago pendiente (la retroalimentación no se bloquea). */
export default async function SugerenciasPortal() {
  const alumno = await requiereAlumno();
  const historial = await prisma.retroalimentaciones.findMany({
    where: { alumno_id: alumno.id }, orderBy: { creado_en: "desc" }, take: 30,
  });

  return (
    <section className="pt-panel">
      <div className="pt-wrap pt-wrap-angosto">
        <header className="pt-head pt-rev" style={{ ["--d" as string]: "0ms" }}>
          <div className="pt-head-id">
            <div>
              <span className="pt-kicker">Portal del alumno</span>
              <h1>Sugerencias</h1>
              <p className="pt-head-sub">Pregunta lo que necesites o proponnos mejoras — el equipo te responde aquí y por correo.</p>
            </div>
          </div>
        </header>
        <RetroCard abiertaSiempre historial={historial.map((r) => ({
          id: r.id, tipo: r.tipo, mensaje: r.mensaje, estado: r.estado,
          fecha: fechaLarga(r.creado_en),
          respuesta: r.respuesta, respondidoEl: r.respondido_en ? fechaLarga(r.respondido_en) : null,
        }))} />
      </div>
    </section>
  );
}
