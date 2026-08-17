import { NextRequest, NextResponse } from "next/server";
import { verificarApiKey } from "@/lib/api";
import { prisma } from "@/lib/db";
import { ahoraPared, isoDia } from "@/lib/fechas";
import { lunesDe, leerSemana } from "@/lib/disponibilidad";
import { enviarCorreo } from "@/lib/correo";

/**
 * POST /api/disponibilidad/recordatorio
 * Pensado para dispararse una vez por semana (cron del VPS o n8n). Si la próxima
 * semana aún no tiene disponibilidad definida, avisa por correo a los admins.
 * El envío real queda pendiente hasta configurar un proveedor (ver lib/correo).
 */
export async function POST(req: NextRequest) {
  const noAuth = verificarApiKey(req);
  if (noAuth) return noAuth;

  const proxLunes = isoDia(new Date(lunesDe(ahoraPared()).getTime() + 7 * 86400_000));
  const yaDefinida = !!(await leerSemana(proxLunes));
  if (yaDefinida) return NextResponse.json({ recordatorio: false, motivo: "la próxima semana ya está definida" });

  const admins = await prisma.usuarios.findMany({
    where: { rol: "admin", activo: true }, select: { email: true, nombre: true },
  });
  const para = admins.map((a) => a.email).filter(Boolean);
  const envio = await enviarCorreo({
    para,
    asunto: "Define la disponibilidad de la próxima semana — Inmath",
    texto: `Hola,\n\nLa semana del ${proxLunes} aún no tiene horarios de asesoría definidos. `
      + `Entra al panel (Disponibilidad) y confirma qué días y horas habrá citas.\n\n`
      + `Mientras tanto, el sitio y Mathy usarán el horario base.`,
  });

  return NextResponse.json({ recordatorio: true, semana: proxLunes, admins: para.length, ...envio });
}
