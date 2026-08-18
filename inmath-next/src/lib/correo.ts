import nodemailer from "nodemailer";
import path from "node:path";
import { existsSync } from "node:fs";

/**
 * Envío de correo vía SMTP (`SMTP_URL`, ej. smtps://user:pass@smtp.host:465).
 * `CORREO_FROM` define el remitente (default: el usuario del SMTP_URL).
 * Sin SMTP_URL configurado, el envío se omite con warning en el log — el
 * resto del sistema llama a enviarCorreo() sin preocuparse por el estado.
 *
 * Los correos van en texto plano + HTML con la identidad del sitio:
 * blanco dominante (regla 60-30-10), bordes delgados de marca, logo con
 * splash de color (adjunto cid) y botones de WhatsApp / página / correo.
 */
export type Correo = { para: string[]; asunto: string; texto: string };

/** Buzón real de contacto del negocio (dudas de usuarios). */
export const CORREO_CONTACTO = "cursosinmath@gmail.com";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Plantilla HTML: 60 blanco / 30 tintas grises / 10 acentos de marca. */
function plantillaHtml(asunto: string, texto: string): string {
  const parrafos = esc(texto.trim())
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;font:400 15px/1.65 Arial,Helvetica,sans-serif;color:#3d4763;">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");
  const wa = (process.env.WHATSAPP_NUMERO ?? "").replace(/\D+/g, "");
  const waUrl = wa ? `https://wa.me/${wa}` : "";
  const sitio = process.env.APP_URL ?? "https://inmath.lumiaaisolutions.com";

  return `<!doctype html>
<html lang="es"><body style="margin:0;padding:0;background:#F4F7FE;">
  <div style="padding:28px 14px;">
    <table role="presentation" align="center" width="100%" style="max-width:560px;margin:0 auto;border-collapse:collapse;">
      <tr><td>
        <!-- hairline de acento (el 10% de color) -->
        <div style="height:4px;border-radius:99px 99px 0 0;background:linear-gradient(90deg,#6B9FFF,#7C5CFF 45%,#F6A62A);"></div>
        <div style="background:#ffffff;border:1px solid #E3EEFF;border-top:0;border-radius:0 0 18px 18px;padding:34px 34px 28px;">
          <!-- logo con splash + wordmark -->
          <div style="text-align:center;margin-bottom:8px;">
            <img src="cid:logoinmath" width="88" height="88" alt="Cursos InMath" style="display:inline-block;border-radius:24px;"/>
            <div style="font:800 20px/1.2 Arial,Helvetica,sans-serif;color:#1B2F52;margin-top:6px;">Cursos <span style="color:#6B9FFF;">InMath</span></div>
          </div>
          <h1 style="margin:18px 0 16px;font:800 21px/1.3 Arial,Helvetica,sans-serif;color:#1B2F52;text-align:center;">${esc(asunto)}</h1>
          <div style="border-top:1px solid #EDF2FD;padding-top:18px;">${parrafos}</div>
          <!-- botones -->
          <table role="presentation" align="center" style="margin:22px auto 6px;border-collapse:separate;border-spacing:8px;">
            <tr>
              ${waUrl ? `<td><a href="${waUrl}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font:700 13px/1 Arial,Helvetica,sans-serif;padding:12px 20px;border-radius:99px;">WhatsApp</a></td>` : ""}
              <td><a href="${sitio}" style="display:inline-block;background:#6B9FFF;color:#ffffff;text-decoration:none;font:700 13px/1 Arial,Helvetica,sans-serif;padding:12px 20px;border-radius:99px;">Visitar la página</a></td>
              <td><a href="mailto:${CORREO_CONTACTO}" style="display:inline-block;background:#ffffff;color:#3d4763;text-decoration:none;font:700 13px/1 Arial,Helvetica,sans-serif;padding:11px 20px;border-radius:99px;border:1.5px solid #D9E9FF;">Escribirnos</a></td>
            </tr>
          </table>
        </div>
        <p style="margin:16px 8px 0;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:#8a93ab;text-align:center;">
          Este correo se envía desde una dirección de solo envío y no recibe respuestas.<br/>
          ¿Necesitas ayuda? Escríbenos a <a href="mailto:${CORREO_CONTACTO}" style="color:#6B9FFF;text-decoration:none;">${CORREO_CONTACTO}</a>
        </p>
      </td></tr>
    </table>
  </div>
</body></html>`;
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
    // Leyenda fija: este buzón es solo de envío; el contacto real es cursosinmath@gmail.com
    const texto = `${c.texto}\n\n—\nEste correo se envía desde una dirección de solo envío y no recibe respuestas.\n¿Necesitas ayuda o quieres escribirnos? Hazlo a ${CORREO_CONTACTO}`;
    const logo = path.join(process.cwd(), "public", "img", "correo-logo.png");
    await transporte.sendMail({
      from,
      to: c.para.join(", "),
      subject: c.asunto,
      text: texto,
      html: plantillaHtml(c.asunto, c.texto),
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
