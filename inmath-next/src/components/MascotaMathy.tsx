/**
 * Mathy: el LIBRO de líneas de siempre (sin pixelar) con ojos que parpadean +
 * dos MANOS FLOTANTES con guante a los LADOS. Las manos hacen animaciones
 * variadas: saludan (rotan), "agarran" (los dedos se cierran/abren) y apuntan
 * hacia Mathy (se señala). Mismo diseño unificado en sitio, panel y portal.
 * Animaciones (keyframes mathy*) en inmath.css y panel.css; respetan
 * prefers-reduced-motion.
 */

/** Guante lateral (muñeca a la izquierda, dedos hacia la derecha). */
function Guante() {
  const linea = { stroke: "#2A4A8C", strokeWidth: 0.7, strokeOpacity: 0.3 };
  return (
    <g>
      {/* puño (azul de marca) */}
      <rect x={-10} y={-3.4} width={4.6} height={6.8} rx={2.3} fill="#4C7EF0" />
      {/* palma */}
      <circle cx={-2.6} cy={0} r={5} fill="#fff" {...linea} />
      {/* pulgar */}
      <rect x={-4.6} y={-8.4} width={3} height={4.6} rx={1.5} fill="#fff" {...linea} transform="rotate(-16 -3 -6)" />
      {/* dedos (apuntan hacia Mathy) — grupo que se cierra para "agarrar" */}
      <g className="mathy-dedos">
        <rect x={1.8} y={-3.6} width={5.6} height={2.4} rx={1.2} fill="#fff" {...linea} />
        <rect x={1.8} y={-1.1} width={6.6} height={2.4} rx={1.2} fill="#fff" {...linea} />
        <rect x={1.8} y={1.4} width={5.2} height={2.4} rx={1.2} fill="#fff" {...linea} />
      </g>
    </g>
  );
}

export function MascotaMathy({ cls = "agente-libro mathy-mascota" }: { cls?: string }) {
  return (
    <svg className={cls} viewBox="0 0 48 48" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* Libro (mismo diseño de líneas) — más chico y centrado para que las
          manos queden claramente FUERA del libro, a los lados. */}
      <g style={{ transform: "translate(24px, 23px) scale(0.58) translate(-24px, -23px)" }}>
        <path d="M24 15 C 17 10.5 10 10 6 13.5 V 33 C 10 29.5 17 30 24 34.5" fill="none" stroke="#5B8DF7" strokeWidth={2.6} />
        <path d="M24 15 C 31 10.5 38 10 42 13.5 V 33 C 38 29.5 31 30 24 34.5" fill="none" stroke="#5B8DF7" strokeWidth={2.6} />
        <line x1={24} y1={15.5} x2={24} y2={34} stroke="#5B8DF7" strokeWidth={1.3} opacity={0.45} />
        {/* Ojos que parpadean */}
        <g className="mathy-ojos">
          <rect x={18.6} y={18.4} width={3.8} height={3.8} rx={0.7} fill="#171C3A" />
          <rect x={25.6} y={18.4} width={3.8} height={3.8} rx={0.7} fill="#171C3A" />
        </g>
      </g>

      {/* Mano IZQUIERDA — puño (manga) tocando el borde del libro, mano y dedos
          claramente AFUERA (a la izquierda). Guante base espejado. */}
      <g style={{ transform: "translate(3px, 23px) scale(-0.88, 0.88)" }}>
        <g className="mathy-mano-izq"><Guante /></g>
      </g>
      {/* Mano DERECHA — puño tocando el borde del libro, mano y dedos AFUERA
          (a la derecha). Guante base sin espejar. */}
      <g style={{ transform: "translate(45px, 23px) scale(0.88)" }}>
        <g className="mathy-mano-der"><Guante /></g>
      </g>
    </svg>
  );
}
