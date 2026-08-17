"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { guardarDisponibilidadAccion } from "./acciones";
import { useToastResultado } from "../ClientePanel";
import type { Resultado } from "../acciones";

const DIAS: [string, string][] = [
  ["1", "Lunes"], ["2", "Martes"], ["3", "Miércoles"], ["4", "Jueves"],
  ["5", "Viernes"], ["6", "Sábado"], ["7", "Domingo"],
];
const HORAS: string[] = (() => {
  const a: string[] = [];
  for (let h = 6; h <= 22; h++) for (const m of ["00", "30"]) a.push(`${String(h).padStart(2, "0")}:${m}`);
  return a;
})();

type Dias = Record<string, { on: boolean; horas: string[] }>;

function sumaDias(iso: string, n: number): string {
  const [y, mo, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, mo - 1, d) + n * 86400_000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}
function rangoLabel(lunes: string): string {
  const dom = sumaDias(lunes, 6);
  const dm = (iso: string) => { const [, mo, d] = iso.split("-"); return `${d}/${mo}`; };
  return `${dm(lunes)} al ${dm(dom)} · ${lunes.slice(0, 4)}`;
}

export function ClienteDisponibilidad({ lunes, lunesActual, dias: diasIni, definida }:
  { lunes: string; lunesActual: string; dias: Dias; definida: boolean }) {
  const toast = useToastResultado();
  const [dias, setDias] = useState<Dias>(diasIni);
  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    const r = await guardarDisponibilidadAccion(prev, fd);
    toast(r);
    return r;
  }, {});

  const prev = sumaDias(lunes, -7);
  const next = sumaDias(lunes, 7);
  const hayPrev = prev >= lunesActual;

  const setOn = (k: string, on: boolean) =>
    setDias((d) => ({ ...d, [k]: { ...d[k], on } }));
  const agregaHora = (k: string, h: string) =>
    setDias((d) => ({ ...d, [k]: { ...d[k], horas: [...new Set([...d[k].horas, h])].sort() } }));
  const quitaHora = (k: string, h: string) =>
    setDias((d) => ({ ...d, [k]: { ...d[k], horas: d[k].horas.filter((x) => x !== h) } }));

  return (
    <>
      <div className="cabecera">
        <div>
          <h1>Disponibilidad</h1>
          <div className="sub">Elige las horas exactas en que das asesorías cada día (no un rango: hora por hora). Alimenta el agendado del sitio y a Mathy (la IA), que ofrecerá exactamente estos horarios.</div>
        </div>
      </div>

      <div className="tarjeta disp-caja">
        <div className="disp-nav">
          {hayPrev
            ? <Link className="boton mini" href={`/panel/disponibilidad?semana=${prev}`}>‹ Semana anterior</Link>
            : <span className="boton mini disp-off">‹ Semana anterior</span>}
          <div className="disp-semana">
            <b>Semana {rangoLabel(lunes)}</b>
            <i className={`disp-estado ${definida ? "ok" : "base"}`}>{definida ? "Ajustada" : "Usando horario base"}</i>
          </div>
          <Link className="boton mini" href={`/panel/disponibilidad?semana=${next}`}>Semana siguiente ›</Link>
        </div>

        <form action={accion} className="disp-form">
          <input type="hidden" name="lunes" value={lunes} />
          {DIAS.map(([k, nombre]) => (
            <div key={k} className={`disp-dia${dias[k].on ? " on" : ""}`}>
              <label className="disp-toggle">
                <input type="checkbox" name={`on_${k}`} value="1" checked={dias[k].on}
                  onChange={(e) => setOn(k, e.target.checked)} />
                <span className="disp-sw" aria-hidden="true" />
                <b>{nombre}</b>
              </label>
              {dias[k].on ? (
                <div className="disp-horas">
                  <input type="hidden" name={`horas_${k}`} value={dias[k].horas.join(",")} />
                  <div className="disp-chips">
                    {dias[k].horas.map((h) => (
                      <span key={h} className="disp-chip">
                        {h}
                        <button type="button" aria-label={`Quitar ${h}`} onClick={() => quitaHora(k, h)}>×</button>
                      </span>
                    ))}
                    {!dias[k].horas.length && <span className="disp-cerrado">Agrega al menos una hora</span>}
                  </div>
                  <select value="" onChange={(e) => { if (e.target.value) agregaHora(k, e.target.value); }}>
                    <option value="">+ Agregar hora</option>
                    {HORAS.filter((h) => !dias[k].horas.includes(h)).map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ) : (
                <span className="disp-cerrado">Sin citas</span>
              )}
            </div>
          ))}
          <div className="disp-pie">
            <button className="boton" disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar esta semana"}</button>
          </div>
        </form>
      </div>
    </>
  );
}
