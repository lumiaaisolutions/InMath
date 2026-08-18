import { prisma } from "./db";
import { ahoraPared } from "./fechas";
import { enviarCorreo } from "./correo";
import { dinero } from "./panel/formato";

/**
 * Vencimiento de pagos pendientes: si en 72h no se confirma el pago, se
 * cancela el registro (pago). Antes se avisa por correo al prospecto (si
 * tiene correo): a las 24h y a las 3h de que se cumpla el plazo.
 * Los avisos ya enviados se guardan en pagos.metadatos.avisos (JSON) para no
 * repetirlos — sin migrar el esquema.
 */
const VIGENCIA_HORAS = 72;
const AVISO_24H_DESDE_HORAS = VIGENCIA_HORAS - 24; // 48h
const AVISO_3H_DESDE_HORAS = VIGENCIA_HORAS - 3; // 69h

type Meta = { avisos?: string[] };

export async function procesarVencimientosPagos() {
  const ahora = ahoraPared();
  const pendientes = await prisma.pagos.findMany({
    where: { estado: "pendiente", link_generado_en: { not: null } },
    include: {
      prospectos: { select: { id: true, nombre: true, correo: true, etapa: true } },
      cursos: { select: { nombre: true } },
    },
  });

  let avisos24 = 0, avisos3 = 0, cancelados = 0;

  for (const pago of pendientes) {
    const generado = pago.link_generado_en!;
    const horas = (ahora.getTime() - generado.getTime()) / 3600_000;
    const meta: Meta = (pago.metadatos as Meta) ?? {};
    const avisos = new Set(meta.avisos ?? []);
    const nombre = pago.prospectos.nombre ?? "Hola";
    const correo = pago.prospectos.correo;

    if (horas >= VIGENCIA_HORAS) {
      await prisma.pagos.update({ where: { id: pago.id }, data: { estado: "cancelado" } });
      cancelados++;
      if (correo) {
        await enviarCorreo({
          para: [correo],
          asunto: "Tu registro de pago fue cancelado — Cursos InMath",
          texto: `Hola ${nombre},\n\nNo detectamos tu pago dentro de las ${VIGENCIA_HORAS} horas y tu registro para ${pago.cursos.nombre} (${dinero(pago.monto_centavos, pago.moneda)}) quedó cancelado.\n\nSi ya pagaste o quieres intentarlo de nuevo, entra a la página y genera un nuevo enlace de pago; con gusto te ayudamos.`,
        });
      }
      continue;
    }

    if (horas >= AVISO_3H_DESDE_HORAS && !avisos.has("3h")) {
      avisos.add("3h");
      await prisma.pagos.update({
        where: { id: pago.id },
        data: { metadatos: { ...meta, avisos: [...avisos] }, recordatorio_enviado_en: ahora },
      });
      avisos3++;
      if (correo) {
        await enviarCorreo({
          para: [correo],
          asunto: "Quedan 3 horas para confirmar tu pago — Cursos InMath",
          texto: `Hola ${nombre},\n\nAún no hemos verificado tu pago de ${pago.cursos.nombre} (${dinero(pago.monto_centavos, pago.moneda)}). Quedan aproximadamente 3 horas antes de que tu registro se cancele automáticamente.\n\nSi ya pagaste, sube tu comprobante en la misma página de inscripción; si tienes dudas, escríbenos.`,
        });
      }
      continue;
    }

    if (horas >= AVISO_24H_DESDE_HORAS && !avisos.has("24h")) {
      avisos.add("24h");
      await prisma.pagos.update({
        where: { id: pago.id },
        data: { metadatos: { ...meta, avisos: [...avisos] }, recordatorio_enviado_en: ahora },
      });
      avisos24++;
      if (correo) {
        await enviarCorreo({
          para: [correo],
          asunto: "Aún no confirmamos tu pago — quedan 24 horas — Cursos InMath",
          texto: `Hola ${nombre},\n\nAún no hemos verificado tu pago de ${pago.cursos.nombre} (${dinero(pago.monto_centavos, pago.moneda)}). Tu registro se cancelará en aproximadamente 24 horas si no lo confirmamos antes.\n\nSi ya pagaste, sube tu comprobante en la misma página de inscripción; si tienes dudas, escríbenos.`,
        });
      }
    }
  }

  return { revisados: pendientes.length, avisos24, avisos3, cancelados };
}
