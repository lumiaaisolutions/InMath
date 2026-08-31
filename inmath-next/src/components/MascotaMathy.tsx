"use client";

import { useId } from "react";

/**
 * Mathy: "Cerebrito" — el cerebro del logo convertido en personaje, con
 * textura de circunvoluciones, birrete que flota arriba de la cabeza (no
 * encajado) y dos manos flotantes que saludan por su cuenta. Mismo diseño
 * unificado en sitio, panel y portal. El logo de marca (isotipo estático)
 * vive aparte en /img/inmath.svg — este componente es solo el agente de IA.
 */

const AZUL_CLARO = "#7CA3FF";
const AZUL = "#4C7EF0";
const AZUL_2 = "#3A5FD9";
const TINTA = "#171C3A";
const CHISPA = "#F5A623";

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

      <ellipse cx={60} cy={112} rx={24} ry={4.2} fill={TINTA} opacity={0.1} />

      {/* mano derecha (a la vista) */}
      <g transform="translate(110 66)">
        <ellipse cx={0} cy={11} rx={3.8} ry={2.6} fill={TINTA} opacity={0.08} />
        <g className="mathy-mano-izq">
          <g className="mathy-saludo">
            <ellipse cx={0} cy={3} rx={7.4} ry={7.8} fill={`url(#${gCerebro})`} />
            <ellipse cx={-6} cy={5} rx={2.7} ry={3.9} fill={`url(#${gCerebro})`} transform="rotate(-24 -6 5)" />
            <ellipse cx={-3.6} cy={-5} rx={1.9} ry={3.6} fill={`url(#${gCerebro})`} transform="rotate(-14 -3.6 -5)" />
            <ellipse cx={0.4} cy={-6.4} rx={1.9} ry={3.8} fill={`url(#${gCerebro})`} />
            <ellipse cx={4.4} cy={-5} rx={1.9} ry={3.6} fill={`url(#${gCerebro})`} transform="rotate(14 4.4 -5)" />
          </g>
        </g>
      </g>
      {/* mano izquierda (a la vista) */}
      <g transform="translate(10 66)">
        <ellipse cx={0} cy={11} rx={3.8} ry={2.6} fill={TINTA} opacity={0.08} />
        <g className="mathy-mano-der">
          <g className="mathy-saludo mathy-saludo-der">
            <ellipse cx={0} cy={3} rx={7.4} ry={7.8} fill={`url(#${gCerebro})`} />
            <ellipse cx={6} cy={5} rx={2.7} ry={3.9} fill={`url(#${gCerebro})`} transform="rotate(24 6 5)" />
            <ellipse cx={3.6} cy={-5} rx={1.9} ry={3.6} fill={`url(#${gCerebro})`} transform="rotate(14 3.6 -5)" />
            <ellipse cx={-0.4} cy={-6.4} rx={1.9} ry={3.8} fill={`url(#${gCerebro})`} />
            <ellipse cx={-4.4} cy={-5} rx={1.9} ry={3.6} fill={`url(#${gCerebro})`} transform="rotate(-14 -4.4 -5)" />
          </g>
        </g>
      </g>

      {/* cerebro: silueta con dos hemisferios y textura de circunvoluciones */}
      <g transform="translate(0 6)">
        <path
          d="M35 58c-9 0-13-10-9-18-4-6-1-15 9-19 4-6 14-10 22-4 8-6 18-2 22 4 10 4 13 13 9 19 4 8 0 18-9 18-2 8-4 16-10 22-6 6-16 6-22 0-6-6-8-14-12-22Z"
          fill={`url(#${gCerebro})`}
        />
        <ellipse cx={40} cy={30} rx={9} ry={5.5} fill="#fff" opacity={0.35} transform="rotate(-24 40 30)" />

        <path d="M60 22c-2 10-2 20 0 30 2 10 2 20 0 30" stroke={AZUL_2} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.5} />
        <path d="M38 32c4-3 9-3 12 0M34 44c5-2 10-1 13 3" stroke={AZUL_2} strokeWidth={1.8} strokeLinecap="round" fill="none" opacity={0.45} />
        <path d="M82 32c-4-3-9-3-12 0M86 44c-5-2-10-1-13 3" stroke={AZUL_2} strokeWidth={1.8} strokeLinecap="round" fill="none" opacity={0.45} />

        {/* solo ojos, sin boca ni mejillas */}
        <ellipse className="mathy-ojo" cx={49} cy={56} rx={3.6} ry={4.6} fill={TINTA} />
        <ellipse className="mathy-ojo" cx={71} cy={56} rx={3.6} ry={4.6} fill={TINTA} />
        <circle cx={50.1} cy={54.3} r={0.9} fill="#fff" />
        <circle cx={72.1} cy={54.3} r={0.9} fill="#fff" />
      </g>

      {/* birrete: flotando arriba de la cabeza, con su propia sombra — no encima */}
      <ellipse cx={60} cy={34} rx={19} ry={3} fill={TINTA} opacity={0.08} />
      <rect x={49} y={16} width={22} height={5.5} rx={2.75} fill={TINTA} />
      <path d="M30 9 60 0l30 9-30 9-30-9Z" fill={TINTA} />
      <path d="M60 1c1 2.5 1 5 0 7.5" stroke="#fff" strokeWidth={1.3} opacity={0.4} />
      <path d="M60 2c7 3.5 10.5 9 8 15" stroke={TINTA} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <circle cx={68} cy={17.5} r={2.4} fill={CHISPA} />
    </svg>
  );
}
