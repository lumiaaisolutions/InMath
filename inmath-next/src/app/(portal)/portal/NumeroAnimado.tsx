"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Conteo animado para las cifras hero del portal. Sube de 0 al valor al entrar
 * en viewport (percepción de progreso — refuerza el "logro"). Respeta
 * prefers-reduced-motion: si el usuario lo pide, muestra el valor final directo.
 */
export function NumeroAnimado({ valor, sufijo = "", duracion = 1100 }: { valor: number; sufijo?: string; duracion?: number }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const yaCorrio = useRef(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setN(valor); return; }
    const el = ref.current;
    if (!el) { setN(valor); return; }

    const arrancar = () => {
      if (yaCorrio.current) return;
      yaCorrio.current = true;
      const inicio = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - inicio) / duracion);
        // easeOutCubic: rápido al inicio, asienta suave (sensación de "llegar")
        const e = 1 - Math.pow(1 - p, 3);
        setN(Math.round(valor * e));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver((ents) => {
      if (ents.some((x) => x.isIntersecting)) { arrancar(); io.disconnect(); }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [valor, duracion]);

  return <span ref={ref}>{n}{sufijo}</span>;
}
