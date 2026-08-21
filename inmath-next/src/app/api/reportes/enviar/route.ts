import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verificarApiKey } from "@/lib/api";
import { ahoraPared } from "@/lib/fechas";
import { generarSemana } from "@/lib/reportes/generador";
import { enviarCorreo } from "@/lib/correo";

/**
 * POST /api/reportes/enviar — genera los reportes de la semana (idempotente) y
 * avisa por correo a cada alumno con correo que su reporte está listo, con
 * enlace a su portal (donde lo descarga autenticado). Marca `enviado_en`.
 *
 * Sustituye al flujo 08 de n8n para el envío: reusa el SMTP que ya funciona en
 * Next.js, sin depender de una credencial SMTP dentro de n8n. Pensado para un
 * cron semanal (lunes por la mañana). Protegido por x-api-key.
 */
export async function POST(req: NextRequest) {
  const noAuth = verificarApiKey(req);
  if (noAuth) return noAuth;

  const cuerpo = await req.json().catch(() => ({}));
  const generados = await generarSemana(cuerpo.semana ?? null);

  const pendientes = await prisma.reportes_generados.findMany({
    where: { enviado_en: null },
    include: { alumnos: { select: { nombre: true, email: true } } },
  });

  const base = (process.env.APP_URL ?? "").replace(/\/$/, "");
  let enviados = 0, sinCorreo = 0;
  for (const r of pendientes) {
    const correo = r.alumnos.email?.trim();
    if (!correo) { sinCorreo++; continue; }
    await enviarCorreo({
      para: [correo],
      asunto: "Tu reporte de avance de la semana está listo — Cursos InMath",
      texto: [
        `Hola ${r.alumnos.nombre},`,
        "",
        "Ya está listo tu reporte de avance de esta semana. Entra a tu portal para verlo y descargarlo:",
        `${base}/portal`,
        "",
        "Ahí también encuentras tu avance del curso, tus asesorías y el material.",
        "",
        "— Cursos InMath",
      ].join("\n"),
    });
    await prisma.reportes_generados.update({ where: { id: r.id }, data: { enviado_en: ahoraPared() } });
    enviados++;
  }

  return NextResponse.json({ generados: generados.length, enviados, sinCorreo, pendientes: pendientes.length });
}
