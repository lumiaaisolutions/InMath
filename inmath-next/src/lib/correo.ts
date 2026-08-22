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
export type Correo = {
  para: string[];
  asunto: string;
  /** Cuerpo en texto (párrafos separados por línea en blanco). Sirve de versión
   *  de texto plano y del bloque principal del HTML. Incluye el saludo. */
  texto: string;
  /** Texto de vista previa (preheader) que muestran los clientes de correo. */
  preheader?: string;
  /** Botón principal de acción. */
  cta?: { url: string; label: string };
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
};

/** Buzón real de contacto del negocio (dudas de usuarios). */
export const CORREO_CONTACTO = "cursosinmath@gmail.com";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const TONOS = {
  azul: { a: "#4C7EF0", b: "#2E56D8", grad: "linear-gradient(90deg,#6B9FFF,#4C7EF0 55%,#7C5CFF)", soft: "#EEF3FF", txt: "#2E56D8" },
  verde: { a: "#34C77B", b: "#1E9E5E", grad: "linear-gradient(90deg,#6FE0A6,#34C77B 55%,#12A594)", soft: "#E9FBF1", txt: "#12855A" },
  ambar: { a: "#F6A62A", b: "#E0871A", grad: "linear-gradient(90deg,#FFD27C,#F6A62A 55%,#F0616C)", soft: "#FFF6E8", txt: "#B8720F" },
  coral: { a: "#F0616C", b: "#DA3E4B", grad: "linear-gradient(90deg,#FF9AA2,#F0616C 55%,#E0424E)", soft: "#FFEDEE", txt: "#C9333F" },
} as const;

/** Plantilla HTML de marca con componentes opcionales. Exportada para pruebas. */
export function plantillaHtml(c: Correo): string {
  const t = TONOS[c.tono ?? "azul"];
  const wa = (process.env.WHATSAPP_NUMERO ?? "").replace(/\D+/g, "");
  const waUrl = wa ? `https://wa.me/${wa}` : "";
  const sitio = (process.env.APP_URL ?? "https://inmath.lumiaaisolutions.com").replace(/\/$/, "");
  const pre = esc(c.preheader ?? c.asunto);

  const parrafos = esc(c.texto.trim())
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;font:400 15px/1.7 Arial,Helvetica,sans-serif;color:#3d4763;">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  const codigoBox = c.codigo
    ? `<table role="presentation" width="100%" style="border-collapse:collapse;margin:6px 0 20px;"><tr><td align="center">
        <div style="display:inline-block;background:${t.soft};border:1.5px dashed ${t.a};border-radius:16px;padding:16px 30px;">
          <div style="font:800 34px/1 'Courier New',monospace;letter-spacing:10px;color:${t.b};text-indent:10px;">${esc(c.codigo)}</div>
        </div></td></tr></table>`
    : "";

  const destacadoBox = c.destacado
    ? `<table role="presentation" width="100%" style="border-collapse:collapse;margin:4px 0 20px;"><tr>
        <td style="background:${t.soft};border-left:4px solid ${t.a};border-radius:0 12px 12px 0;padding:14px 18px;font:600 14.5px/1.6 Arial,Helvetica,sans-serif;color:#2b3552;">${esc(c.destacado).replace(/\n/g, "<br/>")}</td></tr></table>`
    : "";

  const pasosBox = c.pasos?.length
    ? `<table role="presentation" width="100%" style="border-collapse:collapse;margin:4px 0 18px;">${c.pasos.map((p, i) => `
        <tr>
          <td width="34" valign="top" style="padding:5px 0;"><div style="width:26px;height:26px;border-radius:50%;background:${t.grad};color:#fff;font:800 13px/26px Arial,Helvetica,sans-serif;text-align:center;">${i + 1}</div></td>
          <td valign="top" style="padding:7px 0 7px 6px;font:400 14.5px/1.55 Arial,Helvetica,sans-serif;color:#3d4763;">${esc(p).replace(/\n/g, "<br/>")}</td>
        </tr>`).join("")}</table>`
    : "";

  const ctaBox = c.cta
    ? `<table role="presentation" align="center" style="margin:8px auto 6px;border-collapse:collapse;"><tr><td align="center" style="border-radius:99px;background:${t.grad};">
        <a href="${esc(c.cta.url)}" style="display:inline-block;padding:15px 34px;font:800 15px/1 Arial,Helvetica,sans-serif;color:#ffffff;text-decoration:none;border-radius:99px;">${esc(c.cta.label)} &nbsp;›</a>
      </td></tr></table>`
    : "";

  const notaBox = c.nota
    ? `<p style="margin:14px 0 0;font:400 12.5px/1.6 Arial,Helvetica,sans-serif;color:#8a93ab;text-align:center;">${esc(c.nota).replace(/\n/g, "<br/>")}</p>`
    : "";

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light"/></head>
<body style="margin:0;padding:0;background:#EEF3FC;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${pre}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
  <div style="padding:30px 14px;">
    <table role="presentation" align="center" width="100%" style="max-width:580px;margin:0 auto;border-collapse:collapse;">
      <tr><td>
        <!-- barra de acento -->
        <div style="height:6px;border-radius:20px 20px 0 0;background:${t.grad};"></div>
        <div style="background:#ffffff;border:1px solid #E3EEFF;border-top:0;border-radius:0 0 22px 22px;padding:0 0 30px;overflow:hidden;">
          <!-- cabecera -->
          <div style="text-align:center;padding:30px 34px 6px;">
            <img src="cid:logoinmath" width="76" height="76" alt="Cursos InMath" style="display:inline-block;border-radius:22px;"/>
            <div style="font:800 19px/1.2 Arial,Helvetica,sans-serif;color:#1B2F52;margin-top:8px;letter-spacing:.2px;">Cursos <span style="color:${t.a};">InMath</span></div>
          </div>
          <div style="padding:0 34px;">
            <h1 style="margin:16px 0 18px;font:800 22px/1.32 Arial,Helvetica,sans-serif;color:#1B2F52;text-align:center;">${esc(c.asunto)}</h1>
            <div style="border-top:1px solid #EDF2FD;padding-top:20px;">
              ${parrafos}
              ${codigoBox}
              ${destacadoBox}
              ${pasosBox}
              ${ctaBox}
              ${notaBox}
            </div>
            <!-- pie de botones -->
            <table role="presentation" align="center" style="margin:26px auto 4px;border-collapse:separate;border-spacing:7px;">
              <tr>
                ${waUrl ? `<td style="border-radius:99px;background:#25D366;"><a href="${waUrl}" style="display:inline-block;color:#ffffff;text-decoration:none;font:700 13px/1 Arial,Helvetica,sans-serif;padding:11px 18px;">WhatsApp</a></td>` : ""}
                <td style="border-radius:99px;border:1.5px solid #D9E9FF;"><a href="${sitio}" style="display:inline-block;color:#3d4763;text-decoration:none;font:700 13px/1 Arial,Helvetica,sans-serif;padding:10px 18px;">Ir a la página</a></td>
              </tr>
            </table>
          </div>
        </div>
        <p style="margin:18px 8px 0;font:400 12px/1.65 Arial,Helvetica,sans-serif;color:#8a93ab;text-align:center;">
          Este correo se envía desde una dirección de solo envío y no recibe respuestas.<br/>
          ¿Necesitas ayuda? Escríbenos a <a href="mailto:${CORREO_CONTACTO}" style="color:${t.a};text-decoration:none;">${CORREO_CONTACTO}</a>
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
      attachments: existsSync(logo)
        ? [{ filename: "logo.png", path: logo, cid: "logoinmath" }]
        : [],
    });
    return { enviado: true };
  } catch (e) {
    console.error(`[correo] fallo al enviar "${c.asunto}":`, e);
    return { enviado: false, motivo: "el envío falló, revisa SMTP_URL y el log" };
  }
}
