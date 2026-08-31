import nodemailer from "nodemailer";
import path from "node:path";
import { existsSync } from "node:fs";

/**
 * Envío de correo vía SMTP (`SMTP_URL`, ej. smtps://user:pass@smtp.host:465).
 * `CORREO_FROM` define el remitente (default: el usuario del SMTP_URL).
 * Sin SMTP_URL configurado, el envío se omite con warning en el log — el
 * resto del sistema llama a enviarCorreo() sin preocuparse por el estado.
 *
 * Diseño de marca (v68): tarjeta blanca sobre fondo azul suave, cabecera con
 * degradado de marca + logo en splash, tipografía clara y componentes
 * reutilizables (botón CTA, caja de código, pasos numerados, callout). Cada
 * envío puede enriquecer el cuerpo para que quede completo y con instrucciones.
 * Todo es HTML table-based con estilos inline (compatible Gmail/Outlook/Apple).
 */
/** Iconos permitidos en el botón principal — solo para reforzar de un vistazo
 *  qué hace el botón (confirmar, pagar, calendario, contraseña); ninguno es
 *  el valor por defecto (queda solo la flecha, como antes). */
export type IconoCta = "check" | "calendario" | "pago" | "candado";

export type Correo = {
  para: string[];
  asunto: string;
  /** Cuerpo en texto (párrafos separados por línea en blanco). Sirve de versión
   *  de texto plano y del bloque principal del HTML. Incluye el saludo. */
  texto: string;
  /** Texto de vista previa (preheader) que muestran los clientes de correo. */
  preheader?: string;
  /** Botón principal de acción. `icono` es opcional (ver `IconoCta`). */
  cta?: { url: string; label: string; icono?: IconoCta };
  /** Enlace secundario, discreto (subrayado, sin fondo) debajo del botón
   *  principal — para una acción de apoyo que no debe competir con el CTA. */
  enlaceSecundario?: { url: string; label: string };
  /** Código grande (OTP) mostrado en una caja destacada. */
  codigo?: string;
  /** Callout con información clave (fondo resaltado, borde de acento). */
  destacado?: string;
  /** Lista de pasos numerados con círculos. */
  pasos?: string[];
  /** Nota fina bajo el cuerpo (ej. vigencia, aviso). */
  nota?: string;
  /** Tono del acento: azul (default), verde (éxito), ámbar (aviso), coral (alerta). */
  tono?: "azul" | "verde" | "ambar" | "coral";
  /** Adjuntos extra (ej. recibo en PDF), además del logo de marca. */
  adjuntos?: { filename: string; content: Buffer }[];
};

/** SVG de trazo simple (24×24, currentColor) para el botón principal —
 *  intuitivos y discretos, no estilo "sticker". */
const ICONOS_CTA: Record<IconoCta, string> = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  pago: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  candado: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
};
const svgCta = (n: IconoCta) =>
  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:8px;">${ICONOS_CTA[n]}</svg>`;

/** Buzón real de contacto del negocio (dudas de usuarios). */
export const CORREO_CONTACTO = "cursosinmath@gmail.com";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Tonos discretos — un solo color sólido por acento (sin degradado), para
 *  que el correo no compita visualmente consigo mismo. */
const TONOS = {
  azul: { b: "#2E56D8", soft: "#EEF3FF" },
  verde: { b: "#1E9E5E", soft: "#E9FBF1" },
  ambar: { b: "#B8720F", soft: "#FFF6E8" },
  coral: { b: "#C9333F", soft: "#FFEDEE" },
} as const;

/** Plantilla HTML de marca — v76: rediseño "menos saturado" (referencia:
 *  correo transaccional de Anthropic). Tarjeta blanca simple sobre fondo
 *  crema, sin barra de degradado ni cajas apiladas; texto alineado a la
 *  izquierda; un solo botón sólido (con icono opcional) y, si hace falta,
 *  un enlace secundario discreto debajo — nunca dos botones compitiendo.
 *  Exportada para pruebas. */
export function plantillaHtml(c: Correo): string {
  const t = TONOS[c.tono ?? "azul"];
  const sitio = (process.env.APP_URL ?? "https://inmath.lumiaaisolutions.com").replace(/\/$/, "");
  const pre = esc(c.preheader ?? c.asunto);

  const parrafos = esc(c.texto.trim())
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;font:400 15px/1.65 Arial,Helvetica,sans-serif;color:#3d4763;">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  const codigoBox = c.codigo
    ? `<table role="presentation" style="border-collapse:collapse;margin:4px 0 22px;"><tr><td style="background:${t.soft};border-radius:12px;padding:14px 26px;">
        <div style="font:700 28px/1 'Courier New',monospace;letter-spacing:8px;color:${t.b};">${esc(c.codigo)}</div>
        </td></tr></table>`
    : "";

  const destacadoBox = c.destacado
    ? `<table role="presentation" width="100%" style="border-collapse:collapse;margin:4px 0 20px;"><tr>
        <td style="background:${t.soft};border-radius:10px;padding:13px 16px;font:600 14px/1.55 Arial,Helvetica,sans-serif;color:#2b3552;">${esc(c.destacado).replace(/\n/g, "<br/>")}</td></tr></table>`
    : "";

  const pasosBox = c.pasos?.length
    ? `<table role="presentation" width="100%" style="border-collapse:collapse;margin:4px 0 18px;">${c.pasos.map((p, i) => `
        <tr>
          <td width="26" valign="top" style="padding:6px 0;"><div style="width:20px;height:20px;border-radius:50%;background:${t.soft};color:${t.b};font:700 11px/20px Arial,Helvetica,sans-serif;text-align:center;">${i + 1}</div></td>
          <td valign="top" style="padding:6px 0 6px 8px;font:400 14.5px/1.55 Arial,Helvetica,sans-serif;color:#3d4763;">${esc(p).replace(/\n/g, "<br/>")}</td>
        </tr>`).join("")}</table>`
    : "";

  const ctaBox = c.cta
    ? `<table role="presentation" style="margin:6px 0 4px;border-collapse:collapse;"><tr><td style="border-radius:10px;background:#1B2F52;">
        <a href="${esc(c.cta.url)}" style="display:inline-block;padding:13px 26px;font:700 15px/1 Arial,Helvetica,sans-serif;color:#ffffff;text-decoration:none;border-radius:10px;">${c.cta.icono ? svgCta(c.cta.icono) : ""}${esc(c.cta.label)}</a>
      </td></tr></table>`
    : "";

  const enlaceSecundarioBox = c.enlaceSecundario
    ? `<p style="margin:14px 0 4px;"><a href="${esc(c.enlaceSecundario.url)}" style="font:600 14px/1 Arial,Helvetica,sans-serif;color:#3d4763;text-decoration:underline;">${esc(c.enlaceSecundario.label)}</a></p>`
    : "";

  const notaBox = c.nota
    ? `<p style="margin:16px 0 0;font:400 12.5px/1.6 Arial,Helvetica,sans-serif;color:#8a93ab;">${esc(c.nota).replace(/\n/g, "<br/>")}</p>`
    : "";

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light"/></head>
<body style="margin:0;padding:0;background:#F4F1EA;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${pre}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
  <div style="padding:36px 14px;">
    <table role="presentation" align="center" width="100%" style="max-width:560px;margin:0 auto;border-collapse:collapse;">
      <tr><td>
        <div style="background:#ffffff;border:1px solid #ECEEF6;border-radius:18px;padding:32px 32px 30px;">
          <img src="cid:logoinmath" width="36" height="36" alt="Cursos InMath" style="display:block;border-radius:9px;margin-bottom:18px;"/>
          <h1 style="margin:0 0 18px;font:800 21px/1.35 Arial,Helvetica,sans-serif;color:#1B2F52;">${esc(c.asunto)}</h1>
          ${parrafos}
          ${codigoBox}
          ${destacadoBox}
          ${pasosBox}
          ${ctaBox}
          ${enlaceSecundarioBox}
          ${notaBox}
        </div>
        <p style="margin:22px 8px 0;font:400 12.5px/1.6 Arial,Helvetica,sans-serif;color:#8a93ab;text-align:center;">
          ¿Necesitas ayuda? Escríbenos a <a href="mailto:${CORREO_CONTACTO}" style="color:${t.b};text-decoration:none;">${CORREO_CONTACTO}</a>
          &nbsp;·&nbsp; <a href="${sitio}" style="color:#8a93ab;text-decoration:underline;">Ir a la página</a>
        </p>
      </td></tr>
    </table>
  </div>
</body></html>`;
}

/** Versión de texto plano completa (incluye código, pasos y enlace del CTA). */
function plantillaTexto(c: Correo): string {
  const partes = [c.texto.trim()];
  if (c.codigo) partes.push(`\nTu código: ${c.codigo}`);
  if (c.destacado) partes.push(`\n${c.destacado}`);
  if (c.pasos?.length) partes.push("\n" + c.pasos.map((p, i) => `${i + 1}. ${p}`).join("\n"));
  if (c.cta) partes.push(`\n${c.cta.label}: ${c.cta.url}`);
  if (c.nota) partes.push(`\n${c.nota}`);
  partes.push(`\n—\nEste correo se envía desde una dirección de solo envío y no recibe respuestas.\n¿Necesitas ayuda o quieres escribirnos? Hazlo a ${CORREO_CONTACTO}`);
  return partes.join("\n");
}

export async function enviarCorreo(c: Correo): Promise<{ enviado: boolean; motivo?: string }> {
  const url = process.env.SMTP_URL;
  if (!url) {
    console.warn(`[correo] no configurado (falta SMTP_URL) — se omitió: "${c.asunto}" → ${c.para.join(", ")}`);
    return { enviado: false, motivo: "correo no configurado (falta SMTP_URL)" };
  }
  try {
    const transporte = nodemailer.createTransport(url);
    const from = process.env.CORREO_FROM || new URL(url).username;
    const logo = path.join(process.cwd(), "public", "img", "correo-logo.png");
    await transporte.sendMail({
      from,
      to: c.para.join(", "),
      subject: c.asunto,
      text: plantillaTexto(c),
      html: plantillaHtml(c),
      attachments: [
        ...(existsSync(logo) ? [{ filename: "logo.png", path: logo, cid: "logoinmath" }] : []),
        ...(c.adjuntos ?? []),
      ],
    });
    return { enviado: true };
  } catch (e) {
    console.error(`[correo] fallo al enviar "${c.asunto}":`, e);
    return { enviado: false, motivo: "el envío falló, revisa SMTP_URL y el log" };
  }
}
