import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requiereAdmin } from "@/lib/panel/sesion";
import { AjusteFila } from "./ClienteConfiguracion";

export const metadata: Metadata = { title: "Configuración — Inmath CRM" };
export const dynamic = "force-dynamic";

// Solo los ajustes que le sirven al cliente, en lenguaje claro (como el PHP).
const AJUSTES: Record<string, [string, string]> = {
  duracion_cita_minutos: ["Duración de la asesoría", "Minutos que dura cada cita agendada."],
  horario_atencion: ["Horario de atención", "Días y horas en que se ofrecen citas para asesorías."],
  max_slots_ofrecidos: ["Horarios que ofrece el bot", "Cuántas opciones de horario propone el asistente en cada mensaje."],
  recordatorio_cita_horas: ["Recordatorio de cita", "Horas antes de la cita para enviar el recordatorio por WhatsApp."],
  recuperacion_carrito_horas: ["Recordatorio de pago", "Horas de espera tras generar el link de pago antes de recordar al alumno."],
};

export default async function Configuracion() {
  await requiereAdmin();
  const configuraciones = await prisma.configuraciones.findMany({ orderBy: { clave: "asc" } });
  const visibles = configuraciones.filter((c) => AJUSTES[c.clave]);

  return (
    <>
      <div className="cabecera">
        <div>
          <h1>Configuración</h1>
          <div className="sub">Los cambios aplican de inmediato</div>
        </div>
      </div>
      <div className="tarjeta">
        <table className="lista">
          <thead><tr><th style={{ width: 260 }}>Ajuste</th><th>Valor</th><th style={{ width: 90 }}></th></tr></thead>
          <tbody>
            {visibles.map((c) => (
              <tr key={c.clave}>
                <td>
                  <div style={{ fontWeight: 600 }}>{AJUSTES[c.clave][0]}</div>
                  <div style={{ font: "var(--t-mini)", color: "var(--tinta-3)", marginTop: 3 }}>{AJUSTES[c.clave][1]}</div>
                </td>
                <td colSpan={2}>
                  <AjusteFila clave={c.clave} valor={c.valor} esHorario={c.clave === "horario_atencion"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
