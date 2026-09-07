import { mkdir, writeFile, readFile } from "node:fs/promises";
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

function dibujarRecibo(d: DatosRecibo): Buffer {
  const pdf = new PdfLienzo();
  const A = PdfLienzo.ANCHO;
  const cajaX = 56, cajaAncho = A - 112, cajaTop = 742;

  // Header de marca con acento
  pdf.rect(0, cajaTop, A, 50, PRIMARIO);
  pdf.rect(0, cajaTop - 4, A, 4, MENTA);
  pdf.texto(cajaX, cajaTop + 20, 15, "Cursos InMath", true, "FFFFFF");
  pdf.texto(cajaX, cajaTop + 6, 9, "Recibo de pago — cursosinmath@gmail.com", false, "D9E9FF");

  // Título centrado
  const titulo = "¡Gracias! Tu pago se confirmó";
  pdf.texto(centrarX(A, titulo, 20, true), 668, 20, titulo, true, TINTA);
  const sub = `Tu inscripción a ${d.cursoNombre} ya está activa.`;
  pdf.texto(centrarX(A, sub, 11), 648, 11, sub, false, TINTA_2);

  // Caja del "ticket"
  const boxTop = 618, boxBottom = 150;
  pdf.rect(cajaX, boxBottom, cajaAncho, boxTop - boxBottom, "F7F9FF");
  pdf.linea(cajaX, boxTop, cajaX + cajaAncho, boxTop, LINEA, 1.2);
  pdf.linea(cajaX, boxBottom, cajaX + cajaAncho, boxBottom, LINEA, 1.2);
  pdf.linea(cajaX, boxBottom, cajaX, boxTop, LINEA, 1.2);
  pdf.linea(cajaX + cajaAncho, boxBottom, cajaX + cajaAncho, boxTop, LINEA, 1.2);

  let y = boxTop - 34;
  pdf.texto(cajaX + 24, y, 9, "FOLIO", true, TINTA_2);
  pdf.texto(A - cajaX - 24 - anchoAprox(fmtFecha(d.fecha), 9), y, 9, "FECHA", true, TINTA_2);
  y -= 18;
  pdf.texto(cajaX + 24, y, 13, d.folio, true, TINTA);
  pdf.texto(A - cajaX - 24 - anchoAprox(fmtFecha(d.fecha), 11), y, 11, fmtFecha(d.fecha), false, TINTA);

  y -= 30;
  lineaPunteada(pdf, cajaX + 24, A - cajaX - 24, y, "C7D6F5");

  y -= 40;
  pdf.texto(cajaX + 24, y, 9, "MONTO PAGADO", true, TINTA_2);
  y -= 30;
  const monto = `$${dinero(d.montoCentavos, d.moneda).replace(/^\$/, "")}`;
  pdf.texto(cajaX + 24, y, 30, monto, true, PRIMARIO);

  y -= 34;
  lineaPunteada(pdf, cajaX + 24, A - cajaX - 24, y, "C7D6F5");

  y -= 26;
  pdf.texto(cajaX + 24, y, 9, "ALUMNO", true, TINTA_2);
  pdf.texto(cajaX + 24, y - 15, 11, d.alumnoNombre, true, TINTA);
  y -= 40;
  pdf.texto(cajaX + 24, y, 9, "CURSO", true, TINTA_2);
  pdf.texto(cajaX + 24, y - 15, 11, d.cursoNombre, false, TINTA);
  y -= 40;
  pdf.texto(cajaX + 24, y, 9, "MÉTODO DE PAGO", true, TINTA_2);
  pdf.texto(cajaX + 24, y - 15, 11, d.metodo, false, TINTA);

  y -= 34;
  lineaPunteada(pdf, cajaX + 24, A - cajaX - 24, y, "C7D6F5");

  // Barras decorativas + folio legible
  barrasDecorativas(pdf, cajaX + 24, boxBottom + 20, cajaAncho - 48, 30, d.pagoId + 7);
  const folioTxt = `INMATH-${d.folio}`;
  pdf.texto(centrarX(A, folioTxt, 9), boxBottom + 8, 9, folioTxt, false, TINTA_2);

  // Pie
  pdf.texto(cajaX, 60, 8.5, "Este recibo confirma tu inscripción a Cursos InMath. Consérvalo como comprobante de pago.", false, "8A93AB");
  pdf.texto(cajaX, 46, 8.5, "¿Dudas? Escríbenos a cursosinmath@gmail.com", false, "8A93AB");

  return pdf.salida();
}

const NOMBRE_METODO: Record<string, string> = {
  mercadopago: "Tarjeta / OXXO — Mercado Pago",
  transferencia: "Transferencia bancaria",
};

function dirRecibos(): string {
  return path.join(dirStorage(), "recibos");
}
function nombreArchivo(pagoId: number): string {
  return `recibo-${pagoId}.pdf`;
}

/** Genera (o regresa el ya generado) el recibo del pago; devuelve el Buffer. */
export async function generarOLeerRecibo(datos: {
  id: number; monto_centavos: number; moneda: string; procesador: string | null;
  pagado_en: Date | null; referencia_externa: string | null;
  alumnoNombre: string; cursoNombre: string;
}): Promise<Buffer> {
  const dir = dirRecibos();
  const archivo = path.join(dir, nombreArchivo(datos.id));
  try {
    return await readFile(archivo);
  } catch {
    // no existe aún: se genera
  }
  const buf = dibujarRecibo({
    pagoId: datos.id,
    montoCentavos: datos.monto_centavos,
    moneda: datos.moneda,
    metodo: NOMBRE_METODO[datos.procesador ?? ""] ?? "Pago confirmado",
    fecha: datos.pagado_en ?? ahoraPared(),
    alumnoNombre: datos.alumnoNombre,
    cursoNombre: datos.cursoNombre,
    folio: String(datos.id).padStart(6, "0"),
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
  const monto = `$${dinero(p.monto_centavos)} ${p.moneda}`;
  const fecha = p.pagado_en ?? ahoraPared();
  const hayDescuento = precioOriginalCentavos != null && precioOriginalCentavos > p.monto_centavos;
  const lineas: ReciboEmbebido["lineas"] = hayDescuento
    ? [
        { concepto: cursoNombre, detalle: "Inscripción al curso", monto: `$${dinero(precioOriginalCentavos!)} ${p.moneda}` },
        { concepto: "Descuento aplicado", detalle: "Promoción vigente", monto: `−$${dinero(precioOriginalCentavos! - p.monto_centavos)} ${p.moneda}` },
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
