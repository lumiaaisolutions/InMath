"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { IconoPanel } from "@/components/IconoPanel";
import { guardarDisponibilidadAccion } from "./acciones";
import { useToastResultado, SelectorDesplegable } from "../ClientePanel";
import type { Resultado } from "../acciones";

const DIAS: [string, string, string][] = [
  ["1", "Lunes", "L"], ["2", "Martes", "M"], ["3", "Miércoles", "M"], ["4", "Jueves", "J"],
  ["5", "Viernes", "V"], ["6", "Sábado", "S"], ["7", "Domingo", "D"],
];
const HORAS: string[] = (() => {
  const a: string[] = [];
  for (let h = 6; h <= 22; h++) for (const m of ["00", "30"]) a.push(`${String(h).padStart(2, "0")}:${m}`);
  return a;
})();
const PRESETS: [string, string, string][] = [
  ["Mañana", "09:00", "13:00"], ["Tarde", "14:00", "19:00"], ["Todo el día", "08:00", "20:00"],
];

type Dias = Record<string, { on: boolean; horas: string[] }>;

function sumaDias(iso: string, n: number): string {
  const [y, mo, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, mo - 1, d) + n * 86400_000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}
function rangoLabel(lunes: string): string {
  const dom = sumaDias(lunes, 6);
  const dm = (iso: string) => { const [, mo, d] = iso.split("-"); return `${d}/${mo}`; };
  return `${dm(lunes)} al ${dm(dom)}`;
}
/** Horas de `hi` a `hf` INCLUSIVE (ambos extremos quedan como horarios elegibles). */
function rangoHoras(hi: string, hf: string): string[] {
  const i = HORAS.indexOf(hi), f = HORAS.indexOf(hf);
  return i === -1 || f === -1 || f < i ? [] : HORAS.slice(i, f + 1);
}

export function ClienteDisponibilidad({ lunes, lunesActual, lunesProximo, actualDefinida, proximaDefinida, dias: diasIni, definida }:
  { lunes: string; lunesActual: string; lunesProximo: string; actualDefinida: boolean; proximaDefinida: boolean; dias: Dias; definida: boolean }) {
  const toast = useToastResultado();
  const [dias, setDias] = useState<Dias>(diasIni);
  // Referencia de lo YA GUARDADO (para saber si hay cambios sin guardar).
  const [guardadoComo, setGuardadoComo] = useState(() => JSON.stringify(diasIni));
  const sinCambios = JSON.stringify(dias) === guardadoComo;
  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    const r = await guardarDisponibilidadAccion(prev, fd);
    toast(r);
    if (r.ok) setGuardadoComo(JSON.stringify(dias));
    return r;
  }, {});

  const esActual = lunes === lunesActual;
  const esProxima = lunes === lunesProximo;
  const etiquetaSemana = esActual ? "esta semana" : esProxima ? "la próxima semana" : `la semana del ${rangoLabel(lunes)}`;

  const setOn = (k: string, on: boolean) => setDias((d) => ({ ...d, [k]: { ...d[k], on } }));
  const toggleHora = (k: string, h: string) =>
    setDias((d) => {
      const set = new Set(d[k].horas);
      set.has(h) ? set.delete(h) : set.add(h);
      return { ...d, [k]: { ...d[k], horas: [...set].sort() } };
    });
  const aplicarPreset = (k: string, hi: string, hf: string) =>
    setDias((d) => ({ ...d, [k]: { ...d[k], on: true, horas: [...new Set([...d[k].horas, ...rangoHoras(hi, hf)])].sort() } }));
  const limpiarDia = (k: string) => setDias((d) => ({ ...d, [k]: { ...d[k], horas: [] } }));
  const copiarATodos = (k: string) =>
    setDias((d) => {
      const origen = d[k];
      const out = { ...d };
      for (const [dk] of DIAS) out[dk] = { on: true, horas: [...origen.horas] };
      return out;
    });

  const diasActivos = DIAS.filter(([k]) => dias[k].on);
  const [diaEditando, setDiaEditando] = useState<string | null>(null);
  const diaActual = diasActivos.find(([k]) => k === diaEditando) ?? diasActivos[0] ?? null;

  return (
    <>
      <div className="cabecera">
        <div>
          <h1>Disponibilidad</h1>
          <div className="sub">Define en qué días y horas das asesorías. Esto alimenta el calendario de <Link href="/agenda" target="_blank">/agenda</Link> y a Mathy, que solo ofrecerá estos horarios.</div>
        </div>
      </div>

      <div className="stat-fila">
        <div className="stat-tarjeta" style={{ "--stat-col": "var(--pino)" } as React.CSSProperties}>
          <span className="st-etq">Días activos</span>
          <span className="st-num">{diasActivos.length}</span>
        </div>
        <div className="stat-tarjeta" style={{ "--stat-col": "var(--ok)" } as React.CSSProperties}>
          <span className="st-etq">Horarios abiertos</span>
          <span className="st-num">{diasActivos.reduce((n, [k]) => n + dias[k].horas.length, 0)}</span>
        </div>
      </div>

      {/* Resumen de las próximas 2 semanas — para no confundir "esta semana" con "la próxima" */}
      <div className="disp-resumen">
        <Link href={`/panel/disponibilidad?semana=${lunesActual}`} className={`disp-resumen-card${esActual ? " activa" : ""}${!actualDefinida ? " pendiente" : ""}`}>
          <span className="disp-resumen-tit"><IconoPanel n="reloj" cls="ic-sm" /> Esta semana</span>
          <b>{rangoLabel(lunesActual)}</b>
          <i className={`disp-estado ${actualDefinida ? "ok" : "base"}`}>{actualDefinida ? "✓ Ajustada" : "⚠ Sin horarios definidos"}</i>
        </Link>
        <Link href={`/panel/disponibilidad?semana=${lunesProximo}`} className={`disp-resumen-card${esProxima ? " activa" : ""}${!proximaDefinida ? " pendiente" : ""}`}>
          <span className="disp-resumen-tit"><IconoPanel n="reloj" cls="ic-sm" /> Próxima semana</span>
          <b>{rangoLabel(lunesProximo)}</b>
          <i className={`disp-estado ${proximaDefinida ? "ok" : "base"}`}>{proximaDefinida ? "✓ Ajustada" : "⚠ Pendiente"}</i>
        </Link>
      </div>
      <p className="disp-nota-rango">
        <IconoPanel n="reloj" cls="ic-sm" />
        <span><b>/agenda</b> siempre muestra los próximos 7 días desde hoy — si esos días
        caen a caballo entre "esta semana" y "la próxima", verás el horario de ambas combinado. Por eso, si
        solo ajustas una semana, los días de la otra semana <b>no ofrecerán ningún horario</b> hasta que también la definas.</span>
      </p>
      {!proximaDefinida && !esProxima && (
        <Link href={`/panel/disponibilidad?semana=${lunesProximo}`} className="disp-aviso-prox">
          <IconoPanel n="alerta" cls="ic-sm" /> Aún no defines la próxima semana ({rangoLabel(lunesProximo)}) — <b>defínela aquí</b> →
        </Link>
      )}

      <form action={accion} className="disp-form-full">
        <input type="hidden" name="lunes" value={lunes} />

        {/* Paso 1 */}
        <div className="tarjeta disp-caja">
          <div className="disp-paso-tit"><span className="disp-paso-n">1</span> ¿Qué días das asesoría {etiquetaSemana}?</div>
          <div className="disp-dias-fila">
            {DIAS.map(([k, nombre, letra]) => (
              <button key={k} type="button" className={`disp-dia-pill${dias[k].on ? " on" : ""}`}
                onClick={() => setOn(k, !dias[k].on)} aria-pressed={dias[k].on} title={nombre}>
                <span className="ddp-letra">{letra}</span>
                <span className="ddp-nombre">{nombre}</span>
                {dias[k].on && <IconoPanel n="check" cls="ic-sm" />}
              </button>
            ))}
          </div>
        </div>

        {/* Paso 2 */}
        <div className="tarjeta disp-caja">
          <div className="disp-paso-tit"><span className="disp-paso-n">2</span> Elige las horas de cada día activo</div>
          {diasActivos.length === 0 ? (
            <p className="disp-vacio">Activa al menos un día arriba para elegir sus horas.</p>
          ) : diaActual ? (
            <>
              <div className="disp-dia-selector">
                <SelectorDesplegable sinVacio
                  valor={diaActual[0]}
                  onChange={setDiaEditando}
                  opciones={diasActivos.map(([k, nombre]) => ({ valor: k, nombre: `${nombre} — ${dias[k].horas.length} horario${dias[k].horas.length === 1 ? "" : "s"}` }))}
                />
                <div className="disp-dia-chips">
                  {diasActivos.map(([k, , letra]) => (
                    <button key={k} type="button" className={`disp-dia-chip${k === diaActual[0] ? " on" : ""}${!dias[k].horas.length ? " vacio" : ""}`}
                      onClick={() => setDiaEditando(k)} title={`${dias[k].horas.length} horarios`}>
                      {letra}
                    </button>
                  ))}
                </div>
              </div>
              {diasActivos.map(([k, nombre]) => (
                <div key={k} className="disp-dia-bloque" hidden={k !== diaActual[0]}>
                  <div className="disp-dia-bloque-cab">
                    <b>{nombre}</b>
                    <span className="disp-dia-bloque-cont">{dias[k].horas.length} horario{dias[k].horas.length === 1 ? "" : "s"}</span>
                  </div>
                  <div className="disp-presets">
                    {PRESETS.map(([nom, hi, hf]) => (
                      <button key={nom} type="button" className="disp-preset" onClick={() => aplicarPreset(k, hi, hf)}>{nom}</button>
                    ))}
                    <button type="button" className="disp-preset ghost" onClick={() => limpiarDia(k)}>Limpiar</button>
                    <button type="button" className="disp-preset ghost" onClick={() => copiarATodos(k)}>Copiar a todos los días →</button>
                  </div>
                  <input type="hidden" name={`horas_${k}`} value={dias[k].horas.join(",")} />
                  <input type="hidden" name={`on_${k}`} value="1" />
                  <div className="disp-grid-horas">
                    {HORAS.map((h) => (
                      <button key={h} type="button"
                        className={`disp-hora-chip${dias[k].horas.includes(h) ? " on" : ""}`}
                        onClick={() => toggleHora(k, h)} aria-pressed={dias[k].horas.includes(h)}>
                        {h}
                      </button>
                    ))}
                  </div>
                  {!dias[k].horas.length && <small className="disp-cerrado">Elige al menos una hora o desactiva este día.</small>}
                </div>
              ))}
            </>
          ) : null}
          {DIAS.filter(([k]) => !dias[k].on).map(([k]) => <input key={k} type="hidden" name={`on_${k}`} value="" />)}
        </div>

        {/* Paso 3 */}
        <div className="tarjeta disp-caja disp-paso3">
          <div className="disp-paso-tit"><span className="disp-paso-n">3</span> Guarda los cambios</div>
          <p className="disp-vacio" style={{ marginBottom: 14 }}>
            {sinCambios
              ? <><IconoPanel n="check" cls="ic-sm" /> <b>{etiquetaSemana === "esta semana" ? "Esta semana" : etiquetaSemana === "la próxima semana" ? "La próxima semana" : "Esta semana"}</b> ya está guardada tal como se ve arriba ({rangoLabel(lunes)}). Puedes seguir editando y guardar de nuevo cuando quieras.</>
              : <>Tienes cambios <b>sin guardar</b> para <b>{etiquetaSemana}</b> ({rangoLabel(lunes)}).</>}
          </p>
          <div className="disp-pie">
            <div className="disp-pie-nav">
              {lunes > lunesActual && (
                <Link className="boton mini ghost" href={`/panel/disponibilidad?semana=${sumaDias(lunes, -7)}`}>‹ Semana anterior</Link>
              )}
              <Link className="boton mini ghost" href={`/panel/disponibilidad?semana=${sumaDias(lunes, 7)}`}>Semana siguiente ›</Link>
            </div>
            {sinCambios
              ? <span className="disp-guardado-etq"><IconoPanel n="check" cls="ic-sm" /> Guardado</span>
              : <button className="boton" disabled={pendiente}>{pendiente ? "Guardando…" : `Guardar ${etiquetaSemana}`}</button>}
          </div>
        </div>
      </form>
    </>
  );
}
