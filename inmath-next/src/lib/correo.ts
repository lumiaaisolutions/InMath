/**
 * Envío de correo — PENDIENTE de conectar un proveedor real (SMTP o Resend).
 * El sistema aún no tiene servicio de correo configurado; cuando el dueño dé
 * credenciales, implementar el envío aquí (nodemailer con SMTP_URL, o Resend con
 * RESEND_API_KEY) y el resto del sistema ya lo usa a través de enviarCorreo().
 */
export type Correo = { para: string[]; asunto: string; texto: string };

export async function enviarCorreo(c: Correo): Promise<{ enviado: boolean; motivo?: string }> {
  const configurado = !!process.env.SMTP_URL || !!process.env.RESEND_API_KEY;
  if (!configurado) {
    console.warn(`[correo] no configurado — se omitió: "${c.asunto}" → ${c.para.join(", ")}`);
    return { enviado: false, motivo: "correo no configurado (falta SMTP_URL o RESEND_API_KEY)" };
  }
  // TODO: integrar el proveedor real cuando existan credenciales.
  console.warn(`[correo] proveedor detectado pero sin implementar el envío de "${c.asunto}"`);
  return { enviado: false, motivo: "proveedor no implementado" };
}
