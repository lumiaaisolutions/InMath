import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { usuarioActual, moduloPermitido } from "@/lib/panel/sesion";
import { generarOLeerRecibo } from "@/lib/recibo";

/** GET /panel/recibo/{pagoId} — descarga el recibo en PDF (staff con módulo "pagos"). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const u = await usuarioActual();
  if (!u || !moduloPermitido(u, "pagos")) return new Response("Sin acceso", { status: 403 });

  const id = parseInt((await ctx.params).id, 10);
  const pago = await prisma.pagos.findUnique({
    where: { id },
    include: { prospectos: { select: { nombre: true, telefono_whatsapp: true } }, cursos: { select: { nombre: true } } },
  });
  if (!pago || pago.estado !== "pagado") return new Response("Recibo no encontrado", { status: 404 });

  try {
    const contenido = await generarOLeerRecibo({
      id: pago.id, monto_centavos: pago.monto_centavos, moneda: pago.moneda,
      procesador: pago.procesador, pagado_en: pago.pagado_en, referencia_externa: pago.referencia_externa,
      alumnoNombre: pago.prospectos.nombre ?? pago.prospectos.telefono_whatsapp, cursoNombre: pago.cursos.nombre,
    });
    return new Response(new Uint8Array(contenido), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="recibo-inmath-${String(pago.id).padStart(6, "0")}.pdf"`,
        "Content-Length": String(contenido.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "No se pudo generar el recibo" }, { status: 500 });
  }
}
