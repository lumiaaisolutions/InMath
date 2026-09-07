import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { alumnoActual } from "@/lib/portal/sesion";
import { generarOLeerRecibo } from "@/lib/recibo";

/** GET /portal/recibo/{pagoId} — descarga el recibo en PDF SOLO si el pago es
 *  del alumno logueado y ya está confirmado. Genera el PDF bajo demanda si aún
 *  no existía en disco (pagos confirmados antes de esta función). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const alumno = await alumnoActual();
  if (!alumno) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const id = parseInt((await ctx.params).id, 10);
  const pago = await prisma.pagos.findUnique({
    where: { id },
    include: { cursos: { select: { nombre: true, precio_original_centavos: true } } },
  });
  if (!pago || pago.prospecto_id !== alumno.prospecto_id || pago.estado !== "pagado") {
    return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 });
  }

  try {
    const contenido = await generarOLeerRecibo({
      id: pago.id, monto_centavos: pago.monto_centavos, moneda: pago.moneda,
      procesador: pago.procesador, pagado_en: pago.pagado_en, referencia_externa: pago.referencia_externa,
      alumnoNombre: alumno.nombre, cursoNombre: pago.cursos.nombre, precioOriginalCentavos: pago.cursos.precio_original_centavos ?? null,
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
