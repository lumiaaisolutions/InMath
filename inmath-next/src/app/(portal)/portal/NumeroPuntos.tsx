/**
 * Número estilo "dot-matrix" (perforado) — la firma visual de las tarjetas de
 * la referencia (los grandes 70 / 25 / 103 dibujados con puntos). Cada dígito
 * es una rejilla 5×7 de puntos; se renderiza como SVG que escala al contenedor.
 */
const P: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  "%": ["11001", "11010", "00100", "01011", "10011", "00000", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
};

const COLS = 5, ROWS = 7, PASO = 8, R = 2.9, SEP = 1.6 * PASO;

export function NumeroPuntos({ texto, color = "#fff", className }: { texto: string; color?: string; className?: string }) {
  const chars = texto.split("").filter((c) => P[c]);
  const anchoChar = (COLS - 1) * PASO;
  const ancho = chars.length * anchoChar + (chars.length - 1) * SEP + R * 2;
  const alto = (ROWS - 1) * PASO + R * 2;

  const puntos: React.ReactNode[] = [];
  chars.forEach((ch, i) => {
    const ox = i * (anchoChar + SEP) + R;
    P[ch].forEach((fila, r) => {
      for (let c = 0; c < COLS; c++) {
        if (fila[c] === "1") puntos.push(<circle key={`${i}-${r}-${c}`} cx={ox + c * PASO} cy={R + r * PASO} r={R} fill={color} />);
      }
    });
  });

  return (
    <svg className={className} viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label={texto}
      style={{ height: "1em", width: "auto", display: "block" }}>
      {puntos}
    </svg>
  );
}
