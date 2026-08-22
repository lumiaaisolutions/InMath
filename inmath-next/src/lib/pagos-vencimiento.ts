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
  const sitio = (process.env.APP_URL ?? "https://inmath.lumiaaisolutions.com").replace(/\/$/, "");
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
          asunto: "Tu registro de pago fue cancelado",
          tono: "coral",
          preheader: `No detectamos tu pago de ${pago.cursos.nombre} a tiempo. Puedes intentarlo de nuevo.`,
          texto: [
            `Hola ${nombre},`,
            "",
            `No detectamos tu pago de ${pago.cursos.nombre} (${dinero(pago.monto_centavos, pago.moneda)}) dentro de las ${VIGENCIA_HORAS} horas, así que tu registro quedó cancelado.`,
            "",
            "No te preocupes: puedes volver a intentarlo cuando quieras. Si ya pagaste, escríbenos y lo resolvemos.",
          ].join("\n"),
          cta: { url: `${sitio}/pago`, label: "Intentar de nuevo" },
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
          asunto: "Quedan 3 horas para confirmar tu pago",
          tono: "coral",
          preheader: `Tu lugar en ${pago.cursos.nombre} se libera en ~3 horas si no confirmamos tu pago.`,
          texto: [
            `Hola ${nombre},`,
            "",
            `Aún no hemos verificado tu pago de ${pago.cursos.nombre} (${dinero(pago.monto_centavos, pago.moneda)}).`,
          ].join("\n"),
          destacado: "⏳ Quedan aproximadamente 3 horas antes de que tu registro se cancele automáticamente.",
          pasos: [
            "Si ya pagaste, sube tu comprobante en la página de inscripción.",
            "Si aún no pagas, hazlo con el botón de abajo para asegurar tu lugar.",
          ],
          cta: { url: pago.link_pago ?? `${sitio}/pago`, label: "Completar mi pago" },
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
          asunto: "Aún no confirmamos tu pago — quedan 24 horas",
          tono: "ambar",
          preheader: `Tu lugar en ${pago.cursos.nombre} se libera en ~24 horas si no confirmamos tu pago.`,
          texto: [
            `Hola ${nombre},`,
            "",
            `Aún no hemos verificado tu pago de ${pago.cursos.nombre} (${dinero(pago.monto_centavos, pago.moneda)}).`,
          ].join("\n"),
          destacado: "Tu registro se cancelará en aproximadamente 24 horas si no lo confirmamos antes.",
          pasos: [
            "Si ya pagaste, sube tu comprobante en la página de inscripción.",
            "Si aún no pagas, hazlo con el botón de abajo para asegurar tu lugar.",
          ],
          cta: { url: pago.link_pago ?? `${sitio}/pago`, label: "Completar mi pago" },
        });
      }
    }
  }

  return { revisados: pendientes.length, avisos24, avisos3, cancelados };
}
