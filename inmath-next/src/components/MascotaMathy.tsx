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

/* Paleta de la PANTALLA DE CARGA (OverlayCarga usa el gradiente
 * #6B9FFF → #AFCFFF): azules suaves, sin saturar — la mascota comparte
 * silueta Y color con la carga y el logo. */
const AZUL_CLARO = "#AFCFFF";
const AZUL = "#6B9FFF";
const TINTA = "#171C3A";

/** Mano-guante: palma blanca + pulgar y 3 dedos planos, contorno azul —
 *  mismo lenguaje que el guante de la mascota anterior (libro). */
function Guante({ espejo = false }: { espejo?: boolean }) {
  const s = espejo ? -1 : 1;
  const linea = { fill: "#fff", stroke: AZUL, strokeWidth: 0.9 };
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
          <stop offset="1" stopColor={AZUL} />
        </linearGradient>
      </defs>

      <ellipse cx={60} cy={106} rx={24} ry={4.2} fill={TINTA} opacity={0.1} />

      {/* mano derecha (a la vista) — intercambiada con la izquierda */}
      <g transform="translate(110 60)">
        <ellipse cx={0} cy={11} rx={3.8} ry={2.6} fill={TINTA} opacity={0.08} />
        <g className="mathy-mano-izq">
          <g className="mathy-saludo"><Guante /></g>
        </g>
      </g>
      {/* mano izquierda (a la vista) — intercambiada con la derecha */}
      <g transform="translate(10 60)">
        <ellipse cx={0} cy={11} rx={3.8} ry={2.6} fill={TINTA} opacity={0.08} />
        <g className="mathy-mano-der">
          <g className="mathy-saludo mathy-saludo-der"><Guante espejo /></g>
        </g>
      </g>

      {/* cerebro: MISMA silueta de dos hemisferios que dibuja la pantalla de
          carga (OverlayCarga) — el mismo trazo, cerrado y relleno, escalado
          del viewBox 48 al 120 — para que mascota, logo y pantalla de carga
          compartan una sola forma reconocible. */}
      <g transform="translate(60 62) scale(2.45) translate(-24 -26)">
        <path
          d="M24 14 C17 11 10 12 7 17 C4 21 5 26 9 28 C6 31 7 36 12 38 C16 41 21 39 24 35 C27 39 32 41 36 38 C41 36 42 31 39 28 C43 26 44 21 41 17 C38 12 31 11 24 14 Z"
          fill={`url(#${gCerebro})`}
        />
        {/* fisura central, igual que el lomo de la pantalla de carga */}
        <path d="M24 15c-.7 3.4-.7 6.8 0 10.2.7 3.3.7 6.6 0 9.3" stroke="#fff" strokeWidth={0.8} strokeLinecap="round" fill="none" opacity={0.55} />
        {/* brillo superior izquierdo, look pulido */}
        <ellipse cx={15} cy={17} rx={4.6} ry={2.6} fill="#fff" opacity={0.35} transform="rotate(-22 15 17)" />
        {/* solo ojos, sin boca ni mejillas */}
        <ellipse className="mathy-ojo" cx={19.6} cy={27} rx={1.5} ry={1.9} fill={TINTA} />
        <ellipse className="mathy-ojo" cx={28.4} cy={27} rx={1.5} ry={1.9} fill={TINTA} />
        <circle cx={20} cy={26.3} r={0.4} fill="#fff" />
        <circle cx={28.8} cy={26.3} r={0.4} fill="#fff" />
      </g>
    </svg>
  );
}
