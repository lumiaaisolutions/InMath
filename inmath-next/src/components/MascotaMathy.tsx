"use client";

import { useId } from "react";

/**
 * Mathy: "Cerebrito" — el cerebro del logo convertido en personaje, con
 * textura de circunvoluciones, sin birrete y manos-guante flotantes (mismo
 * lenguaje visual — palma blanca + dedos planos con contorno azul — que la
 * mascota anterior del libro) que saludan por su cuenta. Mismo diseño
 * unificado en sitio, panel y portal. El logo de marca (isotipo estático)
 * vive aparte en /img/inmath.svg — este componente es solo el agente de IA.
 */

const AZUL_CLARO = "#7CA3FF";
const AZUL_2 = "#3A5FD9";
const TINTA = "#171C3A";

/** Mano-guante: palma blanca + pulgar y 3 dedos planos, contorno azul —
 *  mismo lenguaje que el guante de la mascota anterior (libro). */
function Guante({ espejo = false }: { espejo?: boolean }) {
  const s = espejo ? -1 : 1;
  const linea = { fill: "#fff", stroke: AZUL_2, strokeWidth: 0.9 };
  return (
    <g>
      <ellipse cx={0} cy={3} rx={7.4} ry={7.8} {...linea} />
      <g transform={`translate(${-6 * s} 5) rotate(${-24 * s})`}><rect x={-1.7} y={-3.6} width={3.4} height={7.2} rx={1.7} {...linea} /></g>
      <g transform={`translate(${-3.6 * s} -5) rotate(${-14 * s})`}><rect x={-1.6} y={-3.4} width={3.2} height={7} rx={1.6} {...linea} /></g>
      <g transform="translate(0.4 -6.4)"><rect x={-1.6} y={-3.6} width={3.2} height={7.2} rx={1.6} {...linea} /></g>
      <g transform={`translate(${4.4 * s} -5) rotate(${14 * s})`}><rect x={-1.6} y={-3.4} width={3.2} height={7} rx={1.6} {...linea} /></g>
    </g>
  );
}

export function MascotaMathy({ cls = "agente-libro mathy-mascota" }: { cls?: string; sinManos?: boolean }) {
  const id = useId();
  const gCerebro = `gCerebro-${id}`;

  return (
    <svg className={cls} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={gCerebro} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={AZUL_CLARO} />
          <stop offset="1" stopColor={AZUL_2} />
        </linearGradient>
      </defs>

      <ellipse cx={60} cy={106} rx={24} ry={4.2} fill={TINTA} opacity={0.1} />

      {/* mano derecha (a la vista) */}
      <g transform="translate(110 60)">
        <ellipse cx={0} cy={11} rx={3.8} ry={2.6} fill={TINTA} opacity={0.08} />
        <g className="mathy-mano-izq">
          <g className="mathy-saludo"><Guante espejo /></g>
        </g>
      </g>
      {/* mano izquierda (a la vista) */}
      <g transform="translate(10 60)">
        <ellipse cx={0} cy={11} rx={3.8} ry={2.6} fill={TINTA} opacity={0.08} />
        <g className="mathy-mano-der">
          <g className="mathy-saludo mathy-saludo-der"><Guante /></g>
        </g>
      </g>

      {/* cerebro: silueta con dos hemisferios y textura de circunvoluciones */}
      <path
        d="M35 52c-9 0-13-10-9-18-4-6-1-15 9-19 4-6 14-10 22-4 8-6 18-2 22 4 10 4 13 13 9 19 4 8 0 18-9 18-2 8-4 16-10 22-6 6-16 6-22 0-6-6-8-14-12-22Z"
        fill={`url(#${gCerebro})`}
      />
      <ellipse cx={40} cy={24} rx={9} ry={5.5} fill="#fff" opacity={0.35} transform="rotate(-24 40 24)" />

      <path d="M60 16c-2 10-2 20 0 30 2 10 2 20 0 30" stroke={AZUL_2} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.5} />
      <path d="M38 26c4-3 9-3 12 0M34 38c5-2 10-1 13 3" stroke={AZUL_2} strokeWidth={1.8} strokeLinecap="round" fill="none" opacity={0.45} />
      <path d="M82 26c-4-3-9-3-12 0M86 38c-5-2-10-1-13 3" stroke={AZUL_2} strokeWidth={1.8} strokeLinecap="round" fill="none" opacity={0.45} />

      {/* solo ojos, sin boca ni mejillas */}
      <ellipse className="mathy-ojo" cx={49} cy={50} rx={3.6} ry={4.6} fill={TINTA} />
      <ellipse className="mathy-ojo" cx={71} cy={50} rx={3.6} ry={4.6} fill={TINTA} />
      <circle cx={50.1} cy={48.3} r={0.9} fill="#fff" />
      <circle cx={72.1} cy={48.3} r={0.9} fill="#fff" />
    </svg>
  );
}
