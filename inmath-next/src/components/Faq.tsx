"use client";
import { useState } from "react";
import { Icono } from "./Icono";

type Item = { pregunta: string; respuesta: string };

/** Acordeón con animación real de apertura Y cierre (grid-rows, sin <details>
 *  nativo porque los navegadores no animan su cierre). */
export function Faq({ items }: { items: Item[] }) {
  const [abierto, setAbierto] = useState(0);
  return (
    <div className="faq">
      {items.map((it, i) => {
        const open = i === abierto;
        return (
          <div key={it.pregunta} className={`faq-item${open ? " open" : ""}`}>
            <button type="button" className="faq-summary" aria-expanded={open}
              onClick={() => setAbierto(open ? -1 : i)}>
              {it.pregunta}
              <span className="mas"><Icono n="plus" /></span>
            </button>
            <div className="faq-cuerpo">
              <div className="faq-cuerpo-in"><p>{it.respuesta}</p></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
