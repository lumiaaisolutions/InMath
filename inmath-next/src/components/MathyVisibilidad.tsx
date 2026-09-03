"use client";
import { useEffect, useState } from "react";

/**
 * Visibilidad global de Mathy (el agente de IA flotante): por DEFAULT visible,
 * con un botón "Ocultar/Mostrar Mathy" en el header de cada zona (sitio,
 * panel, portal). Reemplaza al viejo auto-ocultado por scroll ("recogido"),
 * que en móvil dejaba a la mascota encimada sobre botones de la página
 * bloqueando sus clics sin forma de quitarla.
 *
 * La preferencia se guarda en localStorage y se sincroniza entre el botón y
 * la mascota (misma pestaña vía CustomEvent; otras pestañas vía "storage").
 */
const CLAVE = "mathy_visible";
const EVENTO = "mathy:visibilidad";

function leer(): boolean {
  try { return localStorage.getItem(CLAVE) !== "0"; } catch { return true; }
}

export function useMathyVisible(): boolean {
  // Arranca visible también en SSR/hidratación (el default del producto).
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(leer());
    const alCambiar = () => setVisible(leer());
    window.addEventListener(EVENTO, alCambiar);
    window.addEventListener("storage", alCambiar);
    return () => { window.removeEventListener(EVENTO, alCambiar); window.removeEventListener("storage", alCambiar); };
  }, []);
  return visible;
}

export function MathyToggleBoton({ className = "" }: { className?: string }) {
  const visible = useMathyVisible();
  return (
    <button type="button" className={`mathy-toggle ${className}`.trim()}
      aria-pressed={!visible}
      onClick={() => {
        try { localStorage.setItem(CLAVE, visible ? "0" : "1"); } catch { /* no-op */ }
        window.dispatchEvent(new Event(EVENTO));
      }}>
      {visible ? "Ocultar Mathy" : "Mostrar Mathy"}
    </button>
  );
}
