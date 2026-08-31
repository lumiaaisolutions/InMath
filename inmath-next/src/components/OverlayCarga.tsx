/**
 * Pantalla de carga (logo de marca que se dibuja + barra de progreso).
 * Arranca VISIBLE; el JS de ScriptsSitio/ScriptsPanel lo oculta al montar
 * la ruta y lo re-muestra al navegar o enviar un formulario. `marca` cambia
 * el texto (sitio vs panel).
 */
export function OverlayCarga({ marca = "sitio", id = "cargaOverlay" }: { marca?: "sitio" | "panel"; id?: string }) {
  const gid = `carga-trazo-${marca}`;
  return (
    <div id={id} className="carga-overlay" aria-hidden="true">
      <div className="carga-mesh" aria-hidden="true">
        <span className="c-blob c-b1" /><span className="c-blob c-b2" /><span className="c-blob c-b3" />
      </div>
      <div className="carga-centro">
        <svg className="carga-libro" viewBox="0 0 48 48" aria-hidden="true">
          <defs>
            <linearGradient id={gid} x1="6" y1="34" x2="42" y2="13" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#6B9FFF" /><stop offset="1" stopColor="#AFCFFF" />
            </linearGradient>
          </defs>
          {/* hemisferio izquierdo del cerebro, en línea (mismo trazo del logo) */}
          <path pathLength={1} className="carga-pagina carga-pagina-a"
            d="M24 14 C 17 11 10 12 7 17 C 4 21 5 26 9 28 C 6 31 7 36 12 38 C 16 41 21 39 24 35"
            fill="none" stroke={`url(#${gid})`} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          {/* hemisferio derecho, espejado */}
          <path pathLength={1} className="carga-pagina carga-pagina-b"
            d="M24 14 C 31 11 38 12 41 17 C 44 21 43 26 39 28 C 42 31 41 36 36 38 C 32 41 27 39 24 35"
            fill="none" stroke={`url(#${gid})`} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          {/* birrete al centro, aparece al final como antes hacía el lomo */}
          <path className="carga-lomo" d="M24 20 L31 24 L24 28 L17 24 Z" fill="none" stroke={`url(#${gid})`} strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        <div className="carga-marca">{marca === "panel" ? <>Inmath <span>CRM</span></> : <>Cursos <span>Inmath</span></>}</div>
        <div className="carga-barra"><i /></div>
      </div>
    </div>
  );
}
