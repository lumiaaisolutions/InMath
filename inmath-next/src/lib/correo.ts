import nodemailer from "nodemailer";

/**
 * Envío de correo vía SMTP (`SMTP_URL`, ej. smtps://user:pass@smtp.host:465).
 * `CORREO_FROM` define el remitente (default: el usuario del SMTP_URL).
 * Sin SMTP_URL configurado, el envío se omite con warning en el log — el
 * resto del sistema llama a enviarCorreo() sin preocuparse por el estado.
 */
export type Correo = { para: string[]; asunto: string; texto: string };

export async function enviarCorreo(c: Correo): Promise<{ enviado: boolean; motivo?: string }> {
  const url = process.env.SMTP_URL;
  if (!url) {
    console.warn(`[correo] no configurado (falta SMTP_URL) — se omitió: "${c.asunto}" → ${c.para.join(", ")}`);
    return { enviado: false, motivo: "correo no configurado (falta SMTP_URL)" };
  }
  try {
    const transporte = nodemailer.createTransport(url);
    const from = process.env.CORREO_FROM || new URL(url).username;
    await transporte.sendMail({ from, to: c.para.join(", "), subject: c.asunto, text: c.texto });
    return { enviado: true };
  } catch (e) {
    console.error(`[correo] fallo al enviar "${c.asunto}":`, e);
    return { enviado: false, motivo: "el envío falló, revisa SMTP_URL y el log" };
  }
}
