/**
 * Pantalla de carga (libro que se dibuja + barra de progreso) — port del
 * overlayCarga()/overlayCargaPanel() del PHP. Arranca VISIBLE; el JS de
 * ScriptsSitio/ScriptsPanel lo oculta al montar la ruta y lo re-muestra al
 * navegar o enviar un formulario. `marca` cambia el texto (sitio vs panel).
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
          <path pathLength={1} className="carga-pagina carga-pagina-a" d="M24 15 C 17 10.5 10 10 6 13.5 V 33 C 10 29.5 17 30 24 34.5" fill="none" stroke={`url(#${gid})`} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path pathLength={1} className="carga-pagina carga-pagina-b" d="M24 15 C 31 10.5 38 10 42 13.5 V 33 C 38 29.5 31 30 24 34.5" fill="none" stroke={`url(#${gid})`} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <line className="carga-lomo" x1="24" y1="15" x2="24" y2="34.5" stroke={`url(#${gid})`} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <div className="carga-marca">{marca === "panel" ? <>Inmath <span>CRM</span></> : <>Cursos <span>Inmath</span></>}</div>
        <div className="carga-barra"><i /></div>
      </div>
    </div>
  );
}
