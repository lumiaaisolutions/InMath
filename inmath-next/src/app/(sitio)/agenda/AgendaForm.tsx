"use client";
import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Icono } from "@/components/Icono";
import { agendarAccion, type EstadoAgenda } from "./actions";
import { TZ_NEGOCIO, TZ_NEGOCIO_ETIQUETA, horaEnZona, paredDesde } from "@/lib/fechas";

export type DiaRango = { dia: string; num: string; sem: string; semLarga: string; mes: string; disp: boolean };
export type GrupoDia = { dia: string; horas: { inicio: string; hora: string }[] };

/** Calendario aurora + formulario — port 1:1 del markup de agenda.php. */
export function AgendaForm({ rangoDias, grupos, prefill = null }: {
  rangoDias: DiaRango[]; grupos: GrupoDia[];
  prefill?: { nombre: string; telefono: string; correo: string } | null;
}) {
  const [estado, accion, pendiente] = useActionState<EstadoAgenda, FormData>(agendarAccion, {});
  const primerDisponible = grupos[0]?.dia ?? "";
  const [diaActivo, setDiaActivo] = useState(primerDisponible);
  const [slot, setSlot] = useState("");
  // El PHP solo anima la cabecera/slots al hacer clic, no en el primer render.
  const [interactuo, setInteractuo] = useState(false);
  const activo = rangoDias.find((r) => r.dia === diaActivo);
  const grupo = grupos.find((g) => g.dia === diaActivo);

  // Zona horaria del visitante (detectada en el navegador, nunca en el
  // primer render del servidor — evita descuadres de hidratación). Si no
  // coincide con la del negocio, cada horario muestra también su hora local
  // para que nadie agende pensando que "10:00" es su propia hora.
  const [zonaVisitante, setZonaVisitante] = useState("");
  useEffect(() => {
    try { setZonaVisitante(Intl.DateTimeFormat().resolvedOptions().timeZone); } catch { /* sin soporte, se omite la conversión */ }
  }, []);
  const distinta = zonaVisitante && zonaVisitante !== TZ_NEGOCIO;

  if (estado.ok) {
    return (
      <div className="tarjeta-form">
        <div className="aviso ok" style={{ marginBottom: 0 }}>
          ¡Cita confirmada! Te esperamos el <strong>{estado.ok}</strong>.
          En breve recibirás la confirmación con el enlace de tu asesoría en línea en tu correo.
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
          <input type="hidden" name="zona_horaria" value={zonaVisitante} />
          <div className="campo">
            <label htmlFor="nombre"><Icono n="user" /> Nombre completo</label>
            <input type="text" id="nombre" name="nombre" required defaultValue={prefill?.nombre ?? ""} />
          </div>
          <div className="campo">
            <label htmlFor="telefono"><Icono n="chat" /> WhatsApp (10 dígitos)</label>
            <input type="tel" id="telefono" name="telefono" required inputMode="numeric" placeholder="55 1234 5678" defaultValue={prefill?.telefono ?? ""} />
          </div>
          <div className="campo">
            <label htmlFor="correo"><Icono n="mail" /> Correo</label>
            <input type="email" id="correo" name="correo" required placeholder="tucorreo@ejemplo.com" defaultValue={prefill?.correo ?? ""} />
            <small>Aquí te llega el enlace de tu asesoría en línea.</small>
          </div>
          <div className="campo">
            <label><Icono n="calendar" /> Fechas disponibles</label>
            <small>Horarios en {TZ_NEGOCIO_ETIQUETA} (CDMX){distinta ? " — también te mostramos tu hora local" : ""}.</small>
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
                    onClick={() => { setDiaActivo(r.dia); setInteractuo(true); setSlot(""); }}>
                    <span className="cd-sem">{r.sem}</span>
                    <b className="cd-num">{r.num}</b>
                  </button>
                ))}
              </div>
              <div className="cal-horas">
                {grupo && (
                  <div key={grupo.dia} className={`cal-grupo${interactuo ? " anima" : ""}`} data-dia={grupo.dia}>
                    <div className="slots">
                      {grupo.horas.map((h) => {
                        const local = distinta ? horaEnZona(paredDesde(h.inicio)!, zonaVisitante) : null;
                        return (
                          <button key={h.inicio} type="button" role="radio" aria-checked={slot === h.inicio}
                            className={`slot${slot === h.inicio ? " on" : ""}`} onClick={() => setSlot(h.inicio)}>
                            <span>{h.hora}{local ? <small style={{ display: "block", opacity: .75, fontWeight: 400 }}>{local} tu hora</small> : null}</span>
                          </button>
                        );
                      })}
                    </div>
                    <input type="hidden" name="slot" value={slot} />
                  </div>
                )}
              </div>
            </div>
          </div>
          <button type="submit" className="boton glow glow-halo bloque grande" disabled={pendiente || !slot}>
            {pendiente ? "Agendando…" : "Confirmar mi cita"} <span className="flecha"><Icono n="arrow" /></span>
          </button>
        </form>
      </div>
    </>
  );
}
