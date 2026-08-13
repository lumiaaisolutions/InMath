"use client";
import { useActionState, useState } from "react";
import { configGuardarAccion, type Resultado } from "../acciones";
import { useToastResultado } from "../ClientePanel";

const DIAS: [number, string][] = [[1, "Lun"], [2, "Mar"], [3, "Mié"], [4, "Jue"], [5, "Vie"], [6, "Sáb"], [7, "Dom"]];

/** Fila editable de configuración; horario_atencion tiene UI propia (port del PHP). */
export function AjusteFila({ clave, valor, esHorario }: { clave: string; valor: string; esHorario: boolean }) {
  const toast = useToastResultado();
  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    const r = await configGuardarAccion(prev, fd);
    toast(r);
    return r;
  }, {});

  let h: { dias?: number[]; inicio?: string; fin?: string } = {};
  if (esHorario) { try { h = JSON.parse(valor) || {}; } catch { /* valor corrupto → defaults */ } }
  const [dias, setDias] = useState<number[]>(h.dias ?? [1, 2, 3, 4, 5]);
  const [inicio, setInicio] = useState(h.inicio ?? "09:00");
  const [fin, setFin] = useState(h.fin ?? "19:00");

  if (!esHorario) {
    return (
      <form action={accion} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <input type="hidden" name="clave" value={clave} />
        <input type="text" name="valor" defaultValue={valor} style={{ flex: 1 }} />
        <button className="boton mini" disabled={pendiente}>Guardar</button>
      </form>
    );
  }

  return (
    <form action={accion} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      <input type="hidden" name="clave" value={clave} />
      <input type="hidden" name="valor" value={JSON.stringify({ dias, inicio, fin })} />
      <div className="horario-ui" style={{ flex: 1, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {DIAS.map(([n, nombre]) => (
            <label key={n} style={{ display: "inline-flex", alignItems: "center", gap: 5, font: "500 .8rem var(--cuerpo)", background: "rgba(255,255,255,.6)", border: "1px solid var(--linea-2)", borderRadius: 999, padding: "6px 11px", cursor: "pointer" }}>
              <input type="checkbox" checked={dias.includes(n)}
                onChange={(e) => setDias(e.target.checked ? [...dias, n].sort() : dias.filter((d) => d !== n))} />
              {nombre}
            </label>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", font: "500 .82rem var(--cuerpo)", color: "var(--tinta-2)" }}>
          De <input type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} style={{ width: "auto" }} />
          a <input type="time" value={fin} onChange={(e) => setFin(e.target.value)} style={{ width: "auto" }} />
        </div>
      </div>
      <button className="boton mini" disabled={pendiente}>Guardar</button>
    </form>
  );
}
