"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Icono } from "@/components/Icono";
import { agendarAccion, type EstadoAgenda } from "./actions";

export type DiaRango = { dia: string; num: string; sem: string; semLarga: string; mes: string; disp: boolean };
export type GrupoDia = { dia: string; horas: { inicio: string; hora: string }[] };

/** Calendario aurora + formulario — port 1:1 del markup de agenda.php. */
export function AgendaForm({ rangoDias, grupos }: { rangoDias: DiaRango[]; grupos: GrupoDia[] }) {
  const [estado, accion, pendiente] = useActionState<EstadoAgenda, FormData>(agendarAccion, {});
  const primerDisponible = grupos[0]?.dia ?? "";
  const [diaActivo, setDiaActivo] = useState(primerDisponible);
  // El PHP solo anima la cabecera/slots al hacer clic, no en el primer render.
  const [interactuo, setInteractuo] = useState(false);
  const activo = rangoDias.find((r) => r.dia === diaActivo);
  const grupo = grupos.find((g) => g.dia === diaActivo);

  if (estado.ok) {
    return (
      <div className="tarjeta-form">
        <div className="aviso ok" style={{ marginBottom: 0 }}>
          ¡Cita confirmada! Te esperamos el <strong>{estado.ok}</strong>.
          En breve recibirás la confirmación con el enlace de la videollamada en tu WhatsApp.
        </div>
        <Link className="boton ghost grande" href="/" style={{ marginTop: 20 }}>← Volver al inicio</Link>
      </div>
    );
  }

  return (
    <>
      {estado.error && <div className="aviso error">{estado.error}</div>}
      <div className="tarjeta-form">
        <form action={accion} className="formulario">
          <input type="text" name="sitio_web" defaultValue="" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />
          <div className="campo">
            <label htmlFor="nombre"><Icono n="user" /> Nombre completo</label>
            <input type="text" id="nombre" name="nombre" required />
          </div>
          <div className="campo">
            <label htmlFor="telefono"><Icono n="chat" /> WhatsApp (10 dígitos)</label>
            <input type="tel" id="telefono" name="telefono" required inputMode="numeric" placeholder="55 1234 5678" />
          </div>
          <div className="campo">
            <label><Icono n="calendar" /> Fechas disponibles</label>
            <div className="cal-widget">
              <div className="cal-cab">
                <div className="cal-titulo">
                  <span key={`m-${diaActivo}`} className={`cal-mes${interactuo ? " cambia" : ""}`}>{activo?.mes}</span>
                  <span key={`s-${diaActivo}`} className={`cal-sem${interactuo ? " cambia" : ""}`}>{activo?.semLarga}</span>
                </div>
                <span key={`n-${diaActivo}`} className={`cal-num${interactuo ? " cambia" : ""}`}>{activo?.num}</span>
              </div>
              <div className="cal-strip" role="tablist" aria-label="Días de la semana">
                {rangoDias.map((r) => (
                  <button key={r.dia} type="button" role="tab"
                    className={`cal-dia${r.disp ? " disp" : ""}${r.dia === diaActivo ? " activo" : ""}`}
                    disabled={!r.disp} aria-disabled={!r.disp || undefined}
                    aria-selected={r.dia === diaActivo}
                    onClick={() => { setDiaActivo(r.dia); setInteractuo(true); }}>
                    <span className="cd-sem">{r.sem}</span>
                    <b className="cd-num">{r.num}</b>
                  </button>
                ))}
              </div>
              <div className="cal-horas">
                {grupo && (
                  <div key={grupo.dia} className={`cal-grupo${interactuo ? " anima" : ""}`} data-dia={grupo.dia}>
                    <div className="slots">
                      {grupo.horas.map((h) => (
                        <label key={h.inicio} className="slot">
                          <input type="radio" name="slot" value={h.inicio} required />
                          <span>{h.hora}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <button type="submit" className="boton glow glow-halo bloque grande" disabled={pendiente}>
            {pendiente ? "Agendando…" : "Confirmar mi cita"} <span className="flecha"><Icono n="arrow" /></span>
          </button>
        </form>
      </div>
    </>
  );
}
