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

/** Botón junto al logo de cada panel: una MINI-CARITA de Mathy (misma cara
 *  que el asistente flotante — círculo blanco, anillo azul, dos ojos) para
 *  que se entienda de un vistazo que controla a la IA. Ojos abiertos =
 *  Mathy visible (clic la oculta); dormida (ojos cerrados, botón apagado y
 *  con "z") = oculta (clic la despierta). Con `conTexto`, acompaña la cara
 *  con la acción escrita ("Ocultar a Mathy" / "Mostrar a Mathy"). */
export function MathyToggleBoton({ className = "", conTexto = false }: { className?: string; conTexto?: boolean }) {
  const visible = useMathyVisible();
  const etiqueta = visible ? "Ocultar a Mathy" : "Mostrar a Mathy";
  const alternar = () => {
    try { localStorage.setItem(CLAVE, visible ? "0" : "1"); } catch {}
    window.dispatchEvent(new Event(EVENTO));
  };
  return (
    <button type="button" className={`mathy-toggle${visible ? "" : " mathy-oculta"} ${className}`.trim()}
      aria-pressed={!visible} aria-label={etiqueta} title={etiqueta} onClick={alternar}>
      <span className="mt-cara" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          {visible ? (
            <>
              {/* despierta: los dos ojos azules de Mathy */}
              <ellipse cx="11.3" cy="16" rx="3.4" ry="4.8" fill="currentColor" />
              <ellipse cx="20.7" cy="16" rx="3.4" ry="4.8" fill="currentColor" />
            </>
          ) : (
            <>
              {/* dormida: ojos cerrados + "z" */}
              <path d="M7.5 16.5c2.4 2.6 5.2 2.6 7.6 0" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M17 16.5c2.4 2.6 5.2 2.6 7.6 0" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M21.5 6.6h4.4l-4.4 4.6h4.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}
        </svg>
      </span>
      {conTexto && <span className="mt-tx">{etiqueta}</span>}
    </button>
  );
}
