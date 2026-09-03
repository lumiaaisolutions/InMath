"use client";
import { useEffect, useState } from "react";

/** Visibilidad global de Mathy (la mascota flotante de IA) en el panel de
 *  admin y el portal del alumno. Reemplaza al viejo auto-ocultado por scroll
 *  ("recogido"), que en móvil dejaba la mascota encimada sobre botones de la
 *  página bloqueando sus clics. Por default visible; el estado se guarda en
 *  localStorage y se sincroniza entre componentes (CustomEvent) y pestañas
 *  (evento storage). La LANDING no participa: ahí Mathy siempre se muestra
 *  (decisión de producto 03-sep-2026). */
const CLAVE = "mathy_visible";
const EVENTO = "mathy:visibilidad";

function leer(): boolean {
  try { return localStorage.getItem(CLAVE) !== "0"; } catch { return true; }
}

export function useMathyVisible(): boolean {
  // Default visible también en SSR/primer render (evita parpadeo de hidratación).
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(leer());
    const alCambiar = () => setVisible(leer());
    window.addEventListener(EVENTO, alCambiar);
    window.addEventListener("storage", alCambiar);
    return () => {
      window.removeEventListener(EVENTO, alCambiar);
      window.removeEventListener("storage", alCambiar);
    };
  }, []);
  return visible;
}

/** Botón compacto (ícono de ojo) que vive JUNTO AL LOGO de cada panel.
 *  Ojo abierto = Mathy visible (clic la oculta); ojo tachado = oculta
 *  (clic la muestra). El texto completo va en title/aria-label. */
export function MathyToggleBoton({ className = "" }: { className?: string }) {
  const visible = useMathyVisible();
  const etiqueta = visible ? "Ocultar a Mathy" : "Mostrar a Mathy";
  const alternar = () => {
    try { localStorage.setItem(CLAVE, visible ? "0" : "1"); } catch {}
    window.dispatchEvent(new Event(EVENTO));
  };
  return (
    <button type="button" className={`mathy-toggle${visible ? "" : " mathy-oculta"} ${className}`.trim()}
      aria-pressed={!visible} aria-label={etiqueta} title={etiqueta} onClick={alternar}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {visible ? (
          <>
            <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
            <circle cx="12" cy="12" r="3.1" />
          </>
        ) : (
          <>
            <path d="M4.2 8.6A16.6 16.6 0 0 0 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.3-1.1M9.9 5.9A9 9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16.4 16.4 0 0 1-2.3 3" />
            <path d="M9.8 9.9a3.1 3.1 0 0 0 4.3 4.4" />
            <path d="M4 4l16 16" />
          </>
        )}
      </svg>
    </button>
  );
}
