import type { Metadata } from "next";
import Link from "next/link";
import { slotsDisponibles } from "@/lib/agenda";
import { ahoraPared, isoDia, diaSemanaN } from "@/lib/fechas";
import { Icono, Malla } from "@/components/Icono";
import { AgendaForm, type DiaRango, type GrupoDia } from "./AgendaForm";

export const metadata: Metadata = { title: "Agendar asesoría — Cursos Inmath" };
export const dynamic = "force-dynamic";

const SEM_CORTA = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const SEM_LARGA = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default async function Agenda() {
  // Mismo calendario que usa el chatbot: la disponibilidad sale del mismo servicio.
  const slots = await slotsDisponibles(null, 7, null, 12);
  const diasRango = 7;

  const grupos: GrupoDia[] = [];
  for (const s of slots) {
    const dia = s.inicio.slice(0, 10);
    let g = grupos.find((x) => x.dia === dia);
    if (!g) grupos.push((g = { dia, horas: [] }));
    g.horas.push({ inicio: s.inicio, hora: s.etiqueta.split(",")[1]?.trim() ?? s.etiqueta });
  }

  const hoy = ahoraPared();
  const rangoDias: DiaRango[] = Array.from({ length: diasRango }, (_, i) => {
    const d = new Date(hoy.getTime() + i * 86400_000);
    const dia = isoDia(d);
    return {
      dia, num: String(d.getUTCDate()), sem: SEM_CORTA[diaSemanaN(d)],
      semLarga: SEM_LARGA[diaSemanaN(d)], mes: MESES[d.getUTCMonth() + 1],
      disp: grupos.some((g) => g.dia === dia),
    };
  });

  return (
    <section className="agenda-hero">
      <Malla />
      <div className="centrado">
        <Link className="volver" href="/">← Volver al inicio</Link>
        <div className="agenda-rej">
          <div className="agenda-lado">
            <div className="cab-seccion reveal-mueve" style={{ marginBottom: 22 }}>
              <span className="eyebrow"><Icono n="calendar" cls="ic-ey" /> Asesoría gratis</span>
              <h1>Agenda tu asesoría, sin costo.</h1>
              <p>Una videollamada breve con un asesor real para resolver tus dudas y armar tu plan de estudio. Te llega la confirmación con el enlace por WhatsApp.</p>
            </div>
            <div className="scrub scrub-agenda" aria-label="Asesor sonriendo en videollamada, y una agenda donde se marca la fecha de la cita">
              <img className="scrub-frame f1" src="/img/fotos/agenda-1.jpg" alt="Persona sonriendo durante una videollamada de trabajo" loading="lazy" />
              <img className="scrub-frame f2" src="/img/fotos/agenda-2.jpg" alt="Pluma marcando una fecha en una agenda de papel" loading="lazy" />
              <span className="tinte" />
            </div>
            <div className="agenda-respaldo">
              <span><Icono n="clock" /> 20–30 minutos</span>
              <span><Icono n="user" /> Con un asesor, no un bot</span>
              <span><Icono n="chat" /> Confirmación por WhatsApp</span>
            </div>
          </div>

          <div className="agenda-form-col">
            {grupos.length === 0 ? (
              <div className="tarjeta-form">
                <div className="aviso error" style={{ marginBottom: 0 }}>
                  Por ahora no hay horarios disponibles esta semana. Escríbenos por WhatsApp y buscamos un espacio para ti.
                </div>
              </div>
            ) : (
              <AgendaForm rangoDias={rangoDias} grupos={grupos} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
