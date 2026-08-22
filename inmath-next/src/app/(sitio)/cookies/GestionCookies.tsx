"use client";
import { useEffect, useState } from "react";

/** Preferencia de cookies opcionales guardada en el navegador (localStorage).
 *  El sitio solo usa cookies esenciales; esta preferencia queda lista por si a
 *  futuro se añaden analíticas. */
export function GestionCookies() {
  const [opt, setOpt] = useState<boolean | null>(null);

  useEffect(() => {
    try { setOpt(localStorage.getItem("inmath_cookies_opt") === "1"); } catch { setOpt(false); }
  }, []);

  const guardar = (v: boolean) => {
    setOpt(v);
    try { localStorage.setItem("inmath_cookies_opt", v ? "1" : "0"); } catch {}
  };

  return (
    <div className="ck-panel">
      <div className="ck-row">
        <div className="ck-tx">
          <b>Cookies esenciales</b>
          <span>Necesarias para iniciar sesión y que el sitio funcione. No se pueden desactivar.</span>
        </div>
        <span className="ck-fixed">Siempre activas</span>
      </div>
      <div className="ck-sep" />
      <div className="ck-row">
        <div className="ck-tx">
          <b>Cookies opcionales (analíticas)</b>
          <span>Nos ayudarían a entender cómo se usa el sitio para mejorarlo. Hoy no usamos ninguna; tu preferencia queda guardada.</span>
        </div>
        <button type="button" className={`ck-switch${opt ? " on" : ""}`} role="switch" aria-checked={!!opt}
          onClick={() => guardar(!opt)} disabled={opt === null} aria-label="Cookies opcionales">
          <i />
        </button>
      </div>
      {opt !== null && <p className="ck-nota">{opt ? "Aceptaste las cookies opcionales. Gracias." : "Las cookies opcionales están desactivadas."}</p>}
    </div>
  );
}
