import { prisma } from "./db";
import { ahoraPared } from "./fechas";

type PagoBase = { id: number; prospecto_id: number; curso_id: number };

/**
 * Port de InscripcionServicio::porPago: inscribe al alumno desde un pago
 * confirmado y mueve el prospecto a 'inscrito'. Idempotente por
 * UNIQUE(prospecto_id) en alumnos (absorbe webhooks duplicados).
 */
export async function inscribirPorPago(pago: PagoBase): Promise<number> {
  const prospecto = (await prisma.prospectos.findUnique({ where: { id: pago.prospecto_id } }))!;
  let alumnoId: number;
  try {
    const alumno = await prisma.alumnos.create({
      data: {
        prospecto_id: prospecto.id, curso_id: pago.curso_id,
        nombre: prospecto.nombre ?? `Alumno ${prospecto.telefono_whatsapp}`,
        telefono: prospecto.telefono_whatsapp, inscrito_en: ahoraPared(),
      },
    });
    alumnoId = alumno.id;
  } catch (e: unknown) {
    if ((e as { code?: string }).code !== "P2002") throw e;
    alumnoId = (await prisma.alumnos.findUnique({ where: { prospecto_id: prospecto.id } }))!.id;
  }
  await prisma.pagos.update({ where: { id: pago.id }, data: { alumno_id: alumnoId } });
  if (prospecto.etapa !== "inscrito") {
    await prisma.prospectos.update({ where: { id: prospecto.id }, data: { etapa: "inscrito" } });
    await prisma.bitacora_pipeline.create({
      data: { prospecto_id: prospecto.id, etapa_anterior: prospecto.etapa, etapa_nueva: "inscrito", origen: "sistema", nota: `Pago #${pago.id} confirmado` },
    });
  }
  return alumnoId;
}
