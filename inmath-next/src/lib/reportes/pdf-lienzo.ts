/**
 * Port de Reportes\PdfLienzo: escritor de PDF mínimo sin dependencias.
 * Texto Helvetica (WinAnsi), rectángulos y líneas. Página carta (612×792 pt),
 * origen abajo-izquierda como manda el formato PDF.
 */
export class PdfLienzo {
  static readonly ANCHO = 612;
  static readonly ALTO = 792;

  private contenido = "";

  texto(x: number, y: number, tamano: number, texto: string, negrita = false, colorHex = "000000"): void {
    const fuente = negrita ? "/F2" : "/F1";
    const [r, g, b] = rgb(colorHex);
    this.contenido += `BT ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${fuente} ${tamano.toFixed(1)} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${escapar(texto)}) Tj ET\n`;
  }

  rect(x: number, y: number, ancho: number, alto: number, colorHex: string): void {
    const [r, g, b] = rgb(colorHex);
    this.contenido += `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x.toFixed(1)} ${y.toFixed(1)} ${ancho.toFixed(1)} ${alto.toFixed(1)} re f\n`;
  }

  linea(x1: number, y1: number, x2: number, y2: number, colorHex: string, grosor = 1): void {
    const [r, g, b] = rgb(colorHex);
    this.contenido += `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG ${grosor.toFixed(2)} w ${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S\n`;
  }

  salida(): Buffer {
    const stream = this.contenido;
    const objetos = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PdfLienzo.ANCHO} ${PdfLienzo.ALTO}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
      `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    ];

    let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
    const offsets: number[] = [];
    objetos.forEach((cuerpo, i) => {
      offsets.push(pdf.length);
      pdf += `${i + 1} 0 obj\n${cuerpo}\nendobj\n`;
    });
    const inicioXref = pdf.length;
    pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF`;
    return Buffer.from(pdf, "latin1");
  }
}

// Caracteres fuera de latin1 que CP1252 sí tiene (los que usa el texto del reporte).
const CP1252: Record<string, string> = {
  "—": "\x97", "–": "\x96", "‘": "\x91", "’": "\x92",
  "“": "\x93", "”": "\x94", "…": "\x85", "€": "\x80", "•": "\x95",
};

/** UTF-8 → WinAnsi (CP1252) + escape PDF. */
function escapar(texto: string): string {
  let out = "";
  for (const ch of texto.replace(/\r/g, "").replace(/\n/g, " ")) {
    const code = ch.codePointAt(0)!;
    if (ch === "\\") out += "\\\\";
    else if (ch === "(") out += "\\(";
    else if (ch === ")") out += "\\)";
    else if (code <= 255) out += ch;
    else out += CP1252[ch] ?? "?";
  }
  return out;
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace(/^#/, "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}
