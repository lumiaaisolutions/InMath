"use client";
import { useEffect, useState } from "react";
import { NumeroPuntos } from "./NumeroPuntos";

/** Avance % en dot-matrix que CUENTA de 0 al valor al cargar la página. */
export function AvancePuntos({ valor }: { valor: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(valor); return; }
    let raf = 0;
    const inicio = performance.now();
    const dur = 1300;
    const tick = (t: number) => {
      const p = Math.min(1, (t - inicio) / dur);
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setN(Math.round(valor * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [valor]);
  return <NumeroPuntos texto={`${n}%`} />;
}
