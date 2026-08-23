"use client";
import { useEffect, useState } from "react";

/** Cuenta regresiva en vivo (días/horas/min/seg) hasta `fecha` (ISO local,
 *  ej. "2026-08-30T23:59"). Si ya pasó, no renderiza nada. */
export function CuentaRegresiva({ fecha, className }: { fecha: string; className?: string }) {
  const objetivo = fecha ? new Date(fecha).getTime() : NaN;
  const [restante, setRestante] = useState<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(objetivo)) return;
    const tick = () => setRestante(Math.max(0, objetivo - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [objetivo]);

  if (!Number.isFinite(objetivo) || restante === null || restante <= 0) return null;
  const s = Math.floor(restante / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sg = s % 60;

  return (
    <div className={className} aria-live="off">
      {d > 0 && <><b>{d}</b><small>d</small>{" "}</>}
      <b>{String(h).padStart(2, "0")}</b><small>h</small>{" "}
      <b>{String(m).padStart(2, "0")}</b><small>m</small>{" "}
      <b>{String(sg).padStart(2, "0")}</b><small>s</small>
    </div>
  );
}
