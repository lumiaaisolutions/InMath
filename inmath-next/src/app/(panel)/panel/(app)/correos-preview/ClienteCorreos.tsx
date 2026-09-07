"use client";
import { useMemo, useState } from "react";

type Item = { grupo: string; nombre: string; asunto: string; html: string };

/** Galería de correos: lista por grupo a la izquierda, vista renderizada en
 *  un iframe (aislado del CSS del panel) a la derecha. */
export function GaleriaCorreos({ items }: { items: Item[] }) {
  const [sel, setSel] = useState(0);
  const grupos = useMemo(() => {
    const m = new Map<string, { i: number; nombre: string }[]>();
    items.forEach((it, i) => { if (!m.has(it.grupo)) m.set(it.grupo, []); m.get(it.grupo)!.push({ i, nombre: it.nombre }); });
    return [...m.entries()];
  }, [items]);
  const actual = items[sel];

  return (
    <div className="cp-wrap">
      <nav className="cp-lista">
        {grupos.map(([grupo, lista]) => (
          <div key={grupo} className="cp-grupo">
            <span className="cp-grupo-tit">{grupo}</span>
            {lista.map((l) => (
              <button key={l.i} type="button" className={`cp-item${sel === l.i ? " on" : ""}`} onClick={() => setSel(l.i)}>{l.nombre}</button>
            ))}
          </div>
        ))}
      </nav>
      <div className="cp-vista">
        <div className="cp-asunto"><small>Asunto</small><b>{actual.asunto}</b></div>
        <iframe title={actual.nombre} className="cp-iframe" srcDoc={actual.html} />
      </div>
    </div>
  );
}
