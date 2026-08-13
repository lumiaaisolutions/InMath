import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma, config } from "@/lib/db";
import { ahoraPared, isoDia, paredDesde } from "@/lib/fechas";
import { PdfLienzo } from "./pdf-lienzo";

/**
 * Port de Reportes\GeneradorReporte: reporte semanal de avance por alumno.
 * Branding configurable (clave `reporte_branding`). Idempotente por
 * UNIQUE(alumno_id, periodo_inicio). Los PDF se guardan en el MISMO storage
 * que usa el PHP (backend/storage) para paridad durante el strangler.
 */

export function dirStorage(): string {
  return process.env.STORAGE_DIR ?? path.resolve(process.cwd(), "../backend/storage");
}

function lunesDe(d: Date): Date {
  const l = new Date(d); l.setUTCHours(0, 0, 0, 0);
  const dow = l.getUTCDay() === 0 ? 7 : l.getUTCDay();
  return new Date(l.getTime() - (dow - 1) * 86400_000);
}

const fmtDdMmYyyy = (d: Date) =>
  `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;

export async function generarSemana(lunes: string | null = null) {
  const inicioD = lunes ? lunesDe(paredDesde(`${lunes} 00:00`) ?? ahoraPared()) : lunesDe(ahoraPared());
  const inicio = isoDia(inicioD);
  const fin = isoDia(new Date(inicioD.getTime() + 6 * 86400_000));

  const alumnos = await prisma.alumnos.findMany({
    where: { estado: "activo" },
    include: { cursos: { select: { nombre: true } } },
  });

  const generados = [];
  for (const alumno of alumnos) {
    const existente = await prisma.reportes_generados.findFirst({
      where: { alumno_id: alumno.id, periodo_inicio: inicioD },
    });
    if (existente) continue;
    const ruta = await paraAlumno({ ...alumno, curso_nombre: alumno.cursos.nombre }, inicioD, inicio, fin);
    const reporte = await prisma.reportes_generados.create({
      data: {
        alumno_id: alumno.id,
        periodo_inicio: inicioD,
        periodo_fin: new Date(inicioD.getTime() + 6 * 86400_000),
        archivo: ruta,
        canal: alumno.canal_reporte,
      },
    });
    generados.push(reporte);
  }
  return generados;
}

type AlumnoReporte = { id: number; nombre: string; curso_nombre: string };

/** Dibuja el PDF y devuelve la ruta relativa dentro de storage/. */
export async function paraAlumno(alumno: AlumnoReporte, inicioD: Date, inicio: string, fin: string): Promise<string> {
  let marca: Record<string, string> = {};
  try { marca = JSON.parse(await config("reporte_branding", "{}")) || {}; } catch { /* json corrupto */ }
  const primario = marca.color_primario ?? "3B6FF5";
  const acentoA = marca.color_acento_a ?? "F4A62A";
  const acentoB = marca.color_acento_b ?? "1E9EB8";

  const avances = (await prisma.avance_alumnos.findMany({
    where: { alumno_id: alumno.id }, orderBy: { fecha: "desc" }, take: 8,
    select: { fecha: true, porcentaje: true, detalle: true },
  })).reverse();
  const actual = avances.length ? avances[avances.length - 1].porcentaje : 0;

  const pdf = new PdfLienzo();

  // Cabecera: banda de marca con franja de acento.
  pdf.rect(0, 742, PdfLienzo.ANCHO, 50, primario);
  pdf.rect(0, 738, PdfLienzo.ANCHO, 4, acentoA);
  pdf.texto(40, 762, 16, marca.marca ?? "Cursos Inmath", true, "FFFFFF");
  pdf.texto(40, 748, 9, `Reporte semanal de avance — ${marca.producto ?? "Cursos Inmath"}`, false, "C3D0F5");

  // Identificación
  pdf.texto(40, 700, 20, alumno.nombre, true, primario);
  pdf.texto(40, 682, 10, alumno.curso_nombre ?? "", false, "55625B");
  pdf.texto(40, 668, 10, `Periodo: ${fmtDdMmYyyy(paredDesde(`${inicio} 00:00`)!)} al ${fmtDdMmYyyy(paredDesde(`${fin} 00:00`)!)}`, false, "55625B");

  // Resumen grande
  pdf.texto(40, 600, 44, `${actual}%`, true, acentoA);
  pdf.texto(40, 584, 10, "Avance total del curso", false, "55625B");
  const mensaje = actual >= 80 ? "¡Excelente ritmo! Estás en la recta final."
    : actual >= 40 ? "Buen avance, mantén la constancia semanal."
    : "Ánimo: dedicarle un poco cada día hace la diferencia.";
  pdf.texto(220, 596, 11, mensaje, false, "16261F");

  // Gráfica de barras: histórico semanal
  pdf.texto(40, 540, 12, "Historial de avance", true, primario);
  const baseY = 420, altoMax = 95, anchoBarra = 44;
  let x = 40;
  pdf.linea(40, baseY, 560, baseY, "EAE3D4");
  if (avances.length === 0) {
    pdf.texto(40, baseY + 30, 10, "Aún no hay registros de avance para este alumno.", false, "8A8A95");
  }
  avances.forEach((registro, i) => {
    const alto = Math.max(2, altoMax * registro.porcentaje / 100);
    const color = i % 2 === 0 ? acentoA : acentoB;
    pdf.rect(x, baseY, anchoBarra, alto, color);
    pdf.texto(x + 12, baseY + alto + 6, 9, `${registro.porcentaje}%`, true, primario);
    pdf.texto(x + 6, baseY - 14, 8, `${String(registro.fecha.getUTCDate()).padStart(2, "0")}/${String(registro.fecha.getUTCMonth() + 1).padStart(2, "0")}`, false, "8A8A95");
    x += anchoBarra + 20;
  });

  // Desglose por módulo (del último registro con detalle)
  let detalle: Record<string, unknown> = {};
  for (const registro of [...avances].reverse()) {
    if (registro.detalle && typeof registro.detalle === "object" && !Array.isArray(registro.detalle) && Object.keys(registro.detalle).length) {
      detalle = registro.detalle as Record<string, unknown>;
      break;
    }
  }
  let y = 350;
  const modulos = Object.entries(detalle);
  if (modulos.length) {
    pdf.texto(40, y, 12, "Avance por módulo", true, primario);
    y -= 26;
    for (const [modulo, pctCrudo] of modulos.slice(0, 10)) {
      const pct = Math.max(0, Math.min(100, Number(pctCrudo) || 0));
      pdf.texto(40, y, 10, modulo, false, "16261F");
      pdf.rect(280, y - 2, 220, 9, "EFEADF");
      if (pct > 0) pdf.rect(280, y - 2, 220 * pct / 100, 9, acentoB);
      pdf.texto(510, y, 10, `${pct}%`, true, primario);
      y -= 22;
    }
  }

  // Pie
  const ahora = ahoraPared();
  pdf.linea(40, 52, 572, 52, "EAE3D4");
  pdf.texto(40, 38, 8, marca.pie ?? "Generado automáticamente", false, "8A8A95");
  pdf.texto(460, 38, 8, `${fmtDdMmYyyy(ahora)} ${String(ahora.getUTCHours()).padStart(2, "0")}:${String(ahora.getUTCMinutes()).padStart(2, "0")}`, false, "8A8A95");

  const dir = path.join(dirStorage(), "reportes");
  await mkdir(dir, { recursive: true });
  const nombre = `reporte-${alumno.id}-${inicio}.pdf`;
  await writeFile(path.join(dir, nombre), pdf.salida());
  return `reportes/${nombre}`;
}
