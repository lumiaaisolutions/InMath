import { NextRequest, NextResponse } from "next/server";
import { verificarApiKey } from "@/lib/api";
import { prisma } from "@/lib/db";
import { repararLinkCita } from "@/lib/agenda";
import { enviarCorreo, CORREO_CONTACTO } from "@/lib/correo";
import { etiqueta, ahoraPared } from "@/lib/fechas";

/**
 * POST /api/citas/reparar-links — pensado para un cron cada 10 minutos.
 * Red de seguridad del link de Meet: para cada cita FUTURA activa que quedó
 * sin enlace, reintenta la cadena (robot n8n → respaldo directo de Google) y,
 * si lo consigue, lo guarda y SE LO ENVÍA al prospecto automáticamente.
 * Si una cita cumple 10-20 min sin link (una sola ventana → un solo aviso),
 * manda un correo URGENTE al staff para que lo pegue a mano desde la ficha.
 */
export async function POST(req: NextRequest) {
  const noAuth = verificarApiKey(req);
  if (noAuth) return noAuth;

  const ahora = ahoraPared();
  const pendientes = await prisma.citas.findMany({
    where: { estado: { in: ["agendada", "confirmada"] }, meet_link: null, inicio: { gt: ahora } },
    select: { id: true, creado_en: true, inicio: true, prospectos: { select: { id: true, nombre: true } } },
    orderBy: { inicio: "asc" },
    take: 25,
  });

  let reparadas = 0;
  const sinLink: typeof pendientes = [];
  for (const c of pendientes) {
    const r = await repararLinkCita(c.id);
    if (r.ok) reparadas++;
    else sinLink.push(c);
  }

  // Aviso urgente al staff — solo en la ventana [10, 20) min desde el alta,
  // para no repetirlo en cada pasada del cron.
  const enVentana = sinLink.filter((c) => {
    const min = (Date.now() - c.creado_en.getTime()) / 60000;
    return min >= 10 && min < 20;
  });
  if (enVentana.length) {
    await enviarCorreo({
      para: [CORREO_CONTACTO],
      asunto: `⚠️ URGENTE: ${enVentana.length} asesoría(s) siguen SIN enlace de Meet`,
      preheader: "Los reintentos automáticos no lo han logrado — pégalo a mano desde la ficha.",
      texto: enVentana
        .map((c) => `• ${c.prospectos?.nombre ?? "(sin nombre)"} — ${etiqueta(c.inicio)} (cita #${c.id})`)
        .join("\n"),
      nota: "Genera el Meet a mano y pégalo en la ficha del prospecto (botón \"Pegar link\") — al guardarlo, el correo al cliente sale AUTOMÁTICO. El sistema seguirá reintentando cada 10 minutos de todos modos.",
    }).catch((e) => console.error("reparar-links: no se pudo avisar al staff", e));
  }

  return NextResponse.json({ revisadas: pendientes.length, reparadas, sin_link: sinLink.length, avisadas: enVentana.length });
}
