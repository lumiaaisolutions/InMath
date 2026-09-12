import { prisma } from "./db";
import { ahoraPared, cuandoProspecto, horaEnZona, TZ_NEGOCIO_ETIQUETA } from "./fechas";
import { enviarCorreo } from "./correo";

/**
 * Recordatorios de asesoría por correo — 1 día, 3 horas, 1 hora y 10 minutos
 * antes, a el prospecto Y al asesor. Mismo patrón que `pagos-vencimiento.ts`:
 * los avisos ya enviados se guardan en `citas.metadatos.avisos` (JSON) para
 * no repetirlos, sin tabla nueva. Usa la MISMA plantilla de correo
 * (`enviarCorreo`/`plantillaHtml`) que el resto del sistema — solo cambia
 * el contenido, no el diseño.
 */
type Ventana = { clave: string; minutos: number };
const VENTANAS: Ventana[] = [
  { clave: "1d", minutos: 1440 },
  { clave: "3h", minutos: 180 },
  { clave: "1h", minutos: 60 },
  { clave: "10m", minutos: 10 },
];

type Meta = { avisos?: string[] };

/** Ventanas que YA vencieron al momento de crear la cita (ej. se agendó con
 *  30 min de anticipación): se marcan como "enviadas" SIN mandar el correo,
 *  para que nadie reciba un falso "es mañana" cuando la cita ya es en breve. */
export function ventanasVencidasAlCrear(inicio: Date, ahora: Date): string[] {
  const faltanMin = (inicio.getTime() - ahora.getTime()) / 60_000;
  return VENTANAS.filter((v) => faltanMin < v.minutos).map((v) => v.clave);
}

type CitaConDatos = {
  id: number;
  inicio: Date;
  meet_link: string | null;
  zona_horaria_prospecto: string | null;
  metadatos: Meta | null;
  prospectos: { nombre: string | null; correo: string | null };
  usuarios: { nombre: string; email: string };
};

function correoProspecto(cita: CitaConDatos, clave: string) {
  const nombre = cita.prospectos.nombre ?? "";
  const cuando = cuandoProspecto(cita.inicio);
  const horaLocal = horaEnZona(cita.inicio, cita.zona_horaria_prospecto);
  const destacadoZona = horaLocal ? `Tu hora local es ${horaLocal} — el horario de arriba está en ${TZ_NEGOCIO_ETIQUETA}.` : undefined;
  const cta = cita.meet_link ? { url: cita.meet_link, label: "Unirme a mi asesoría en línea", icono: "calendario" as const } : undefined;
  const notaSinLink = "En cuanto esté listo el enlace de tu asesoría en línea te lo compartimos — si no llega antes, un asesor te lo comparte al iniciar.";

  switch (clave) {
    case "1d":
      return {
        asunto: "Tu asesoría es mañana — Cursos InMath",
        tono: "azul" as const,
        preheader: `Te recordamos tu asesoría de mañana, ${cuando}.`,
        texto: `Hola ${nombre},\n\nTe recordamos que tu asesoría con Cursos InMath es mañana, el ${cuando}.`,
        destacado: destacadoZona,
        cta, ...(cta ? {} : { nota: notaSinLink }),
      };
    case "3h":
      return {
        asunto: "Faltan 3 horas para tu asesoría — Cursos InMath",
        tono: "azul" as const,
        preheader: `Tu asesoría del ${cuando} es en unas 3 horas.`,
        texto: `Hola ${nombre},\n\nFaltan aproximadamente 3 horas para tu asesoría con Cursos InMath del ${cuando}.`,
        destacado: destacadoZona,
        cta, ...(cta ? {} : { nota: notaSinLink }),
      };
    case "1h":
      return {
        asunto: "Tu asesoría es en 1 hora — Cursos InMath",
        tono: "ambar" as const,
        preheader: `Tu asesoría del ${cuando} es en aproximadamente 1 hora.`,
        texto: `Hola ${nombre},\n\nTu asesoría con Cursos InMath es en aproximadamente 1 hora (${cuando}).`,
        destacado: destacadoZona,
        cta, ...(cta ? {} : { nota: notaSinLink }),
      };
    default: // "10m"
      return {
        asunto: "¡Tu asesoría empieza en 10 minutos! — Cursos InMath",
        tono: "coral" as const,
        preheader: "Tu asesoría con Cursos InMath está a punto de comenzar.",
        texto: `Hola ${nombre},\n\nTu asesoría con Cursos InMath está a punto de comenzar (${cuando}). Toca el botón para unirte.`,
        destacado: destacadoZona,
        cta: cta ?? undefined,
        ...(cta ? {} : { nota: "Estamos por confirmarte el enlace — un asesor te lo comparte en cualquier momento." }),
      };
  }
}

function correoAsesor(cita: CitaConDatos, clave: string) {
  const prospectoNombre = cita.prospectos.nombre ?? "(sin nombre)";
  const cuando = cuandoProspecto(cita.inicio);
  const cta = cita.meet_link ? { url: cita.meet_link, label: "Unirme a la asesoría en línea", icono: "calendario" as const } : undefined;

  const titulos: Record<string, { asunto: string; cuando_texto: string; tono: "azul" | "ambar" | "coral" }> = {
    "1d": { asunto: `Mañana tienes una asesoría con ${prospectoNombre}`, cuando_texto: "mañana", tono: "azul" },
    "3h": { asunto: `En 3 horas: asesoría con ${prospectoNombre}`, cuando_texto: "en unas 3 horas", tono: "azul" },
    "1h": { asunto: `En 1 hora: asesoría con ${prospectoNombre}`, cuando_texto: "en aproximadamente 1 hora", tono: "ambar" },
    "10m": { asunto: `Tu asesoría con ${prospectoNombre} empieza en 10 minutos`, cuando_texto: "en unos minutos", tono: "coral" },
  };
  const t = titulos[clave] ?? titulos["10m"];
  return {
    asunto: `${t.asunto} — Cursos InMath`,
    tono: t.tono,
    preheader: `Asesoría con ${prospectoNombre} ${t.cuando_texto} — ${cuando}.`,
    texto: `Hola ${cita.usuarios.nombre},\n\nTienes una asesoría ${t.cuando_texto} con ${prospectoNombre}, agendada para el ${cuando}.`,
    cta,
    ...(cta ? {} : { nota: "El enlace de Meet aún no está listo; el sistema lo reintenta solo y avisa en cuanto exista." }),
  };
}

export async function procesarRecordatoriosCitas() {
  const ahora = ahoraPared();
  const citas = (await prisma.citas.findMany({
    where: { estado: { in: ["agendada", "confirmada"] }, inicio: { gt: ahora } },
    include: {
      prospectos: { select: { nombre: true, correo: true } },
      usuarios: { select: { nombre: true, email: true } },
    },
  })) as unknown as CitaConDatos[];

  let enviadosProspecto = 0, enviadosAsesor = 0;
  for (const cita of citas) {
    const faltanMin = (cita.inicio.getTime() - ahora.getTime()) / 60_000;
    const meta: Meta = cita.metadatos ?? {};
    const avisos = new Set(meta.avisos ?? []);
    let cambiado = false;

    for (const v of VENTANAS) {
      if (faltanMin > v.minutos || avisos.has(v.clave)) continue;
      avisos.add(v.clave);
      cambiado = true;

      if (cita.prospectos.correo) {
        await enviarCorreo({ para: [cita.prospectos.correo], ...correoProspecto(cita, v.clave) })
          .then((r) => { if (r.enviado) enviadosProspecto++; })
          .catch((e) => console.error("procesarRecordatoriosCitas: correo a prospecto falló", cita.id, v.clave, e));
      }
      await enviarCorreo({ para: [cita.usuarios.email], ...correoAsesor(cita, v.clave) })
        .then((r) => { if (r.enviado) enviadosAsesor++; })
        .catch((e) => console.error("procesarRecordatoriosCitas: correo a asesor falló", cita.id, v.clave, e));
    }

    if (cambiado) {
      await prisma.citas.update({
        where: { id: cita.id },
        data: { metadatos: { ...meta, avisos: [...avisos] }, recordatorio_enviado_en: ahora },
      });
    }
  }
  return { revisadas: citas.length, enviadosProspecto, enviadosAsesor };
}
