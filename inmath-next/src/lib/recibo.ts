import { mkdir, writeFile, readFile } from "node:fs/promises";
import sharp from "sharp";
import path from "node:path";
import { PdfLienzo } from "./reportes/pdf-lienzo";
import { dirStorage } from "./reportes/generador";
import { dinero } from "./panel/formato";
import { ahoraPared } from "./fechas";
import type { ReciboEmbebido } from "./correo";

/**
 * Recibo de pago en PDF, estilo "ticket" (folio, monto, fecha, método,
 * franja decorativa tipo código de barras) — se genera una vez al confirmarse
 * el pago y se reutiliza (cacheado en disco) para el correo y las descargas
 * desde el portal/panel.
 */
type DatosRecibo = {
  pagoId: number;
  montoCentavos: number;
  moneda: string;
  metodo: string;
  fecha: Date;
  alumnoNombre: string;
  cursoNombre: string;
  folio: string;
  lineas: { concepto: string; detalle?: string; monto: string }[];
};

const PRIMARIO = "2F62F0";
const MENTA = "12A594";
const TINTA = "1B2F52";
const TINTA_2 = "565D72";
const LINEA = "E3EEFF";

const fmtFecha = (d: Date) => {
  const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};

/** Línea punteada (PdfLienzo no tiene dash-pattern nativo: se simula con segmentos). */
function lineaPunteada(pdf: PdfLienzo, x1: number, x2: number, y: number, color: string) {
  const paso = 8, hueco = 5;
  for (let x = x1; x < x2; x += paso + hueco) pdf.linea(x, y, Math.min(x + paso, x2), y, color, 1.4);
}

/** Franja decorativa tipo código de barras (no es un código real y escaneable). */
function barrasDecorativas(pdf: PdfLienzo, x: number, y: number, ancho: number, alto: number, semilla: number) {
  let cx = x;
  let s = semilla;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s % 1000) / 1000; };
  while (cx < x + ancho) {
    const grosor = 1.5 + rnd() * 3.5;
    if (rnd() > 0.35) pdf.rect(cx, y, grosor, alto, "1B2F52");
    cx += grosor + 1.5 + rnd() * 2;
  }
}

/** Ancho aproximado de un texto en Helvetica (para centrar), en puntos. */
const anchoAprox = (texto: string, tam: number, negrita = false) => texto.length * tam * (negrita ? 0.62 : 0.54);
const centrarX = (pageAncho: number, texto: string, tam: number, negrita = false) =>
  (pageAncho - anchoAprox(texto, tam, negrita)) / 2;


// Logo de marca convertido a JPEG (DeviceRGB, fondo blanco) para embeberlo en
// el PDF. Se decodifica una vez y se reutiliza.
let _logoJpeg: { datos: Buffer; ancho: number; alto: number } | null | undefined;
async function logoRecibo(): Promise<{ datos: Buffer; ancho: number; alto: number } | null> {
  if (_logoJpeg !== undefined) return _logoJpeg;
  try {
    const ruta = path.join(process.cwd(), "public", "img", "correo-logo.png");
    const png = await readFile(ruta);
    const lado = 220;
    const datos = await sharp(png).resize(lado, lado, { fit: "contain", background: "#ffffff" }).flatten({ background: "#ffffff" }).jpeg({ quality: 92 }).toBuffer();
    _logoJpeg = { datos, ancho: lado, alto: lado };
  } catch (e) {
    console.error("[recibo] no se pudo cargar el logo:", e);
    _logoJpeg = null;
  }
  return _logoJpeg;
}

async function dibujarRecibo(d: DatosRecibo): Promise<Buffer> {
  const pdf = new PdfLienzo();
  const A = PdfLienzo.ANCHO;
  const M = 64;               // margen izq/der
  const anchoUtil = A - M * 2;
  const montoTxt = dinero(d.montoCentavos, d.moneda);

  // ── Ondas de acento de marca (suaves, colores del sistema) ──
  // Onda superior derecha (azul→menta muy claros) y onda inferior izquierda
  // (durazno claro). Curvas Bézier, sin saturar.
  pdf.pathRelleno(`612 792 m 612 700 l 470 748 380 726 270 762 c 180 792 l h`, "EAF1FF");
  pdf.pathRelleno(`612 792 m 612 730 l 480 768 400 752 320 780 c 250 792 l h`, "E4F5EF");
  pdf.pathRelleno(`0 0 m 0 92 l 150 44 250 70 360 30 c 430 0 l h`, "FDEEE4");
  pdf.pathRelleno(`0 0 m 0 74 l 130 34 230 54 330 22 c 380 0 l h`, "FBE7DC");

  // Logo real (si cargó) + wordmark
  const logo = await logoRecibo();
  if (logo) {
    pdf.registrarImagen(logo.datos, logo.ancho, logo.alto);
    pdf.imagen(M, 730, 34, 34);
    pdf.texto(M + 44, 748, 15, "Cursos InMath", true, TINTA);
    pdf.texto(M + 44, 734, 8.5, "Recibo de pago oficial", false, "8A93AB");
  } else {
    pdf.texto(M, 748, 15, "Cursos InMath", true, TINTA);
    pdf.rect(M, 743, 26, 3, PRIMARIO);
  }

  // ── Tarjeta 1: encabezado del recibo (monto grande + datos) ──
  const c1Top = 720, c1Bottom = 470;
  tarjeta(pdf, M, c1Bottom, anchoUtil, c1Top - c1Bottom);
  let y = c1Top - 30;
  pdf.texto(M + 24, y, 10, "Recibo de Cursos InMath", false, TINTA_2);
  y -= 34;
  pdf.texto(M + 24, y, 30, montoTxt, true, TINTA);
  y -= 20;
  pdf.texto(M + 24, y, 10, `Pagado el ${fmtFechaCorta(d.fecha)}`, false, "8A93AB");
  y -= 26;
  pdf.linea(M + 24, y, A - M - 24, y, LINEA, 1);
  // filas Folio / Alumno / Método
  const filas: [string, string][] = [["Folio", `INM-${d.folio}`], ["Alumno", d.alumnoNombre], ["Método de pago", d.metodo]];
  for (const [k, v] of filas) {
    y -= 26;
    pdf.texto(M + 24, y, 10.5, k, false, "8A93AB");
    pdf.texto(A - M - 24 - anchoAprox(v, 10.5, true), y, 10.5, v, true, TINTA);
  }

  // ── Tarjeta 2: detalle ──
  const c2Top = 452, c2Bottom = 452 - (60 + d.lineas.length * 34);
  tarjeta(pdf, M, c2Bottom, anchoUtil, c2Top - c2Bottom);
  let y2 = c2Top - 28;
  pdf.texto(M + 24, y2, 12, "Detalle", true, TINTA);
  y2 -= 26;
  for (const l of d.lineas) {
    pdf.texto(M + 24, y2, 11, l.concepto, true, TINTA);
    pdf.texto(A - M - 24 - anchoAprox(l.monto, 11, true), y2, 11, l.monto, true, TINTA);
    if (l.detalle) { y2 -= 13; pdf.texto(M + 24, y2, 8.5, l.detalle, false, "8A93AB"); }
    y2 -= 21;
  }
  pdf.linea(M + 24, y2 + 4, A - M - 24, y2 + 4, LINEA, 1);
  y2 -= 18;
  pdf.texto(M + 24, y2, 13, "Total pagado", true, TINTA);
  pdf.texto(A - M - 24 - anchoAprox(montoTxt, 13, true), y2, 13, montoTxt, true, "1E9E5E");

  // Pie discreto
  pdf.texto(M, 90, 8.5, "Este recibo confirma tu inscripción a Cursos InMath. Consérvalo como comprobante de pago.", false, "8A93AB");
  pdf.texto(M, 76, 8.5, "¿Dudas? Escríbenos a cursosinmath@gmail.com", false, "8A93AB");

  return pdf.salida();
}

/** Tarjeta blanca con borde gris (rect relleno blanco + 4 líneas de borde). */
function tarjeta(pdf: PdfLienzo, x: number, y: number, ancho: number, alto: number) {
  pdf.rect(x, y, ancho, alto, "FFFFFF");
  pdf.linea(x, y + alto, x + ancho, y + alto, "ECEEF6", 1);
  pdf.linea(x, y, x + ancho, y, "ECEEF6", 1);
  pdf.linea(x, y, x, y + alto, "ECEEF6", 1);
  pdf.linea(x + ancho, y, x + ancho, y + alto, "ECEEF6", 1);
}

const NOMBRE_METODO: Record<string, string> = {
  mercadopago: "Tarjeta / OXXO — Mercado Pago",
  transferencia: "Transferencia bancaria",
};

function dirRecibos(): string {
  return path.join(dirStorage(), "recibos");
}
function nombreArchivo(pagoId: number): string {
  // -v2: nuevo diseño (tarjeta unificada) — invalida los recibos cacheados viejos.
  return `recibo-${pagoId}-v2.pdf`;
}

/** Genera (o regresa el ya generado) el recibo del pago; devuelve el Buffer. */
export async function generarOLeerRecibo(datos: {
  id: number; monto_centavos: number; moneda: string; procesador: string | null;
  pagado_en: Date | null; referencia_externa: string | null;
  alumnoNombre: string; cursoNombre: string; precioOriginalCentavos?: number | null;
}): Promise<Buffer> {
  const dir = dirRecibos();
  const archivo = path.join(dir, nombreArchivo(datos.id));
  try {
    return await readFile(archivo);
  } catch {
    // no existe aún: se genera
  }
  const moneda = datos.moneda;
  const montoTxt = dinero(datos.monto_centavos, moneda);
  const hayDesc = datos.precioOriginalCentavos != null && datos.precioOriginalCentavos > datos.monto_centavos;
  const lineas = hayDesc
    ? [
        { concepto: datos.cursoNombre, detalle: "Inscripción al curso", monto: dinero(datos.precioOriginalCentavos!, moneda) },
        { concepto: "Descuento aplicado", detalle: "Promoción vigente", monto: `-${dinero(datos.precioOriginalCentavos! - datos.monto_centavos, moneda)}` },
      ]
    : [{ concepto: datos.cursoNombre, detalle: "Inscripción al curso", monto: montoTxt }];
  const buf = await dibujarRecibo({
    pagoId: datos.id,
    montoCentavos: datos.monto_centavos,
    moneda,
    metodo: NOMBRE_METODO[datos.procesador ?? ""] ?? "Pago confirmado",
    fecha: datos.pagado_en ?? ahoraPared(),
    alumnoNombre: datos.alumnoNombre,
    cursoNombre: datos.cursoNombre,
    folio: String(datos.id).padStart(6, "0"),
    lineas,
  });
  await mkdir(dir, { recursive: true });
  await writeFile(archivo, buf);
  return buf;
}

const METODO_LABEL: Record<string, string> = {
  mercadopago: "MercadoPago", stripe: "Tarjeta (Stripe)", conekta: "Tarjeta (Conekta)",
  transferencia: "Transferencia", simulado: "Pago manual", efectivo: "Efectivo / OXXO",
};

/** Datos del recibo EMBEBIDO (tarjeta del correo/portal) desde un pago —
 *  única fuente de verdad para el correo del alumno, el del admin y la
 *  vista del portal. El PDF usa los mismos campos base. */
export function reciboEmbebidoDesdePago(p: {
  id: number; monto_centavos: number; moneda: string; procesador: string | null;
  pagado_en: Date | null; referencia_externa: string | null;
}, alumnoNombre: string, cursoNombre: string,
  // Precio de LISTA del curso (config en el panel): si es mayor a lo pagado,
  // el recibo muestra el original tachado y el descuento aplicado.
  precioOriginalCentavos?: number | null,
): ReciboEmbebido {
  const monto = dinero(p.monto_centavos, p.moneda);
  const fecha = p.pagado_en ?? ahoraPared();
  const hayDescuento = precioOriginalCentavos != null && precioOriginalCentavos > p.monto_centavos;
  const lineas: ReciboEmbebido["lineas"] = hayDescuento
    ? [
        { concepto: cursoNombre, detalle: "Inscripción al curso", monto: dinero(precioOriginalCentavos!, p.moneda) },
        { concepto: "Descuento aplicado", detalle: "Promoción vigente", monto: `−${dinero(precioOriginalCentavos! - p.monto_centavos, p.moneda)}` },
      ]
    : [{ concepto: cursoNombre, detalle: "Inscripción al curso", monto }];
  return {
    folio: `INM-${String(p.id).padStart(6, "0")}`,
    montoTexto: monto,
    fechaTexto: `Pagado el ${fmtFechaCorta(fecha)}`,
    metodo: METODO_LABEL[p.procesador ?? ""] ?? (p.procesador ?? "—"),
    alumno: alumnoNombre,
    lineas,
    totalTexto: monto,
  };
}

const fmtFechaCorta = (d: Date) => {
  const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
