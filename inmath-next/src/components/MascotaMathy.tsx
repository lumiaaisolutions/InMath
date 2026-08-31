/**
 * Mathy: el logo de marca (cerebro + circuito + birrete) como ícono del
 * agente — vectorial, sin fondo y sin pixelar a ningún tamaño. Reemplaza al
 * libro de líneas anterior. Mismo diseño unificado en sitio, panel y portal.
 */

const AZUL = "#4C7EF0";

/** Un "lóbulo" del cerebro (arco del circuito) repetido y rotado alrededor
 *  del centro para formar el halo circular, como en el logo original. */
const ANGULOS = [0, 45, 90, 135, 180, 225, 270, 315];
const NODOS = [0, 90, 135, 225, 270];

export function MascotaMathy({ cls = "agente-libro mathy-mascota" }: { cls?: string; sinManos?: boolean }) {
  return (
    <svg className={cls} viewBox="0 0 48 48" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <g>
        {ANGULOS.map((a) => (
          <circle key={a} cx={24} cy={24} r={5.9} stroke={AZUL} strokeWidth={1.3}
            transform={`rotate(${a} 24 24) translate(0 -15)`} />
        ))}
        {NODOS.map((a) => (
          <circle key={a} className="mathy-nodo" cx={24} cy={24} r={1.4} fill={AZUL} stroke="#fff" strokeWidth={0.6}
            transform={`rotate(${a} 24 24) translate(0 -21.3)`} />
        ))}
        {/* birrete visto desde arriba, al centro */}
        <path d="M24 17 L34.5 24 L24 31 L13.5 24 Z" fill={AZUL} />
      </g>
    </svg>
  );
}
