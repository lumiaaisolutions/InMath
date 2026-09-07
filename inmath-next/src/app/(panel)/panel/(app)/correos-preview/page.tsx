import type { Metadata } from "next";
import { requiereAdmin } from "@/lib/panel/sesion";
import { plantillaHtml, type Correo } from "@/lib/correo";
import { GaleriaCorreos } from "./ClienteCorreos";

export const metadata: Metadata = { title: "Vista previa de correos — Inmath CRM" };
export const dynamic = "force-dynamic";

/** Recibo de ejemplo para los correos de pago. */
const reciboDemo = {
  folio: "INM-000123", montoTexto: "$4,000.00 MXN", fechaTexto: "Pagado el 7 sep 2026",
  metodo: "MercadoPago", alumno: "Fernando Torres",
  lineas: [{ concepto: "Curso Propedéutico InMath (Premium · Hasta 8 meses)", detalle: "Inscripción al curso", monto: "$4,000.00 MXN" }],
  totalTexto: "$4,000.00 MXN",
};

/** TODOS los correos del sistema con datos de ejemplo, agrupados por flujo.
 *  Fuente de verdad para revisar y ajustar el diseño de cada uno. */
const CORREOS: { grupo: string; nombre: string; correo: Correo }[] = [
  // ── Inscripción y pagos ──
  { grupo: "Pagos", nombre: "Inscripción activa (al alumno, con recibo)", correo: {
    para: [""], asunto: "¡Tu inscripción está activa!", tono: "verde",
    preheader: "Confirmamos tu pago. Ya puedes entrar a tu portal.",
    texto: "Hola Fernando,\n\n¡Excelente noticia! Confirmamos tu pago por Curso Propedéutico InMath y tu inscripción ya está activa. 🎉\n\nDesde tu portal tienes tu avance, asesorías, material y reportes.",
    recibo: reciboDemo, destacado: "Tus datos de acceso:\nUsuario: fernando@correo.com\nContraseña temporal: Xk48mple",
    cta: { url: "#", label: "Entrar a mi portal", icono: "candado" },
    nota: "Por tu seguridad, cambia tu contraseña temporal la primera vez que entres." } },
  { grupo: "Pagos", nombre: "Pago confirmado (al admin, con recibo)", correo: {
    para: [""], asunto: "💰 Pago confirmado — Fernando Torres", tono: "verde",
    preheader: "Fernando pagó. Ya quedó inscrito y con acceso.",
    texto: "Fernando Torres (fernando@correo.com) completó su pago por Curso Propedéutico InMath. Su cuenta ya quedó inscrita y con acceso al portal.\n\nAdjuntamos el recibo; abajo el mismo detalle.",
    recibo: reciboDemo, cta: { url: "#", label: "Ver en el panel", icono: "pago" } } },
  { grupo: "Pagos", nombre: "Recibimos tu comprobante (al alumno)", correo: {
    para: [""], asunto: "Recibimos tu comprobante", tono: "verde",
    preheader: "Estamos revisando tu comprobante.",
    texto: "Hola Fernando,\n\n¡Gracias! Recibimos tu comprobante de pago y ya lo estamos revisando.",
    destacado: "En cuanto lo confirmemos (normalmente el mismo día), tu portal se desbloquea y tus datos de acceso te llegan por este correo." } },
  { grupo: "Pagos", nombre: "Comprobante recibido (al admin)", correo: {
    para: [""], asunto: "📎 Comprobante recibido — Fernando Torres", tono: "ambar",
    preheader: "Un alumno subió su comprobante — revísalo.",
    texto: "Fernando Torres (fernando@correo.com) subió su comprobante de pago por transferencia. Revísalo en el panel y, si todo está bien, apruébalo para darle acceso al portal.",
    cta: { url: "#", label: "Revisar comprobante", icono: "pago" } } },
  { grupo: "Pagos", nombre: "Apartamos tu lugar (link de pago)", correo: {
    para: [""], asunto: "Apartamos tu lugar en Curso Propedéutico InMath", tono: "azul",
    preheader: "Completa tu pago para asegurar tu inscripción.",
    texto: "Hola Fernando,\n\nApartamos tu lugar. Completa tu pago para asegurar tu inscripción; el enlace es seguro y expira en 72 horas.",
    cta: { url: "#", label: "Completar mi pago", icono: "pago" } } },
  { grupo: "Pagos", nombre: "Vencimiento 24h", correo: {
    para: [""], asunto: "Aún no confirmamos tu pago — quedan 24 horas", tono: "ambar",
    preheader: "Tu lugar se libera en 24 horas.",
    texto: "Hola Fernando,\n\nTodavía no vemos tu pago confirmado. Tu lugar se libera en 24 horas.",
    cta: { url: "#", label: "Completar mi pago", icono: "pago" } } },
  { grupo: "Pagos", nombre: "Vencimiento 3h", correo: {
    para: [""], asunto: "Quedan 3 horas para confirmar tu pago", tono: "coral",
    preheader: "Últimas horas para asegurar tu lugar.",
    texto: "Hola Fernando,\n\nEstas son las últimas horas para asegurar tu lugar. Después tendrías que empezar de nuevo.",
    cta: { url: "#", label: "Completar mi pago", icono: "pago" } } },
  { grupo: "Pagos", nombre: "Registro de pago cancelado", correo: {
    para: [""], asunto: "Tu registro de pago fue cancelado", tono: "coral",
    preheader: "Tu registro de pago se canceló.",
    texto: "Hola Fernando,\n\nTu registro de pago fue cancelado. Si fue un error, escríbenos y lo resolvemos." } },
  // ── Asesorías ──
  { grupo: "Asesorías", nombre: "Asesoría confirmada (con Meet)", correo: {
    para: [""], asunto: "Tu asesoría está confirmada — Cursos InMath", tono: "verde",
    preheader: "Aquí está el enlace de tu asesoría en línea.",
    texto: "Hola Fernando,\n\nTu asesoría quedó agendada para el viernes 12 de septiembre, 17:00. Toca el botón para unirte en ese horario.",
    cta: { url: "#", label: "Unirme a mi asesoría en línea", icono: "calendario" } } },
  { grupo: "Asesorías", nombre: "Enlace de asesoría (llega tarde)", correo: {
    para: [""], asunto: "El enlace de tu asesoría — Cursos InMath", tono: "verde",
    preheader: "Aquí está el enlace de tu asesoría en línea.",
    texto: "Hola Fernando,\n\nAquí está el enlace de tu asesoría en línea del viernes 12, 17:00. Guárdalo y únete en ese horario con un clic.",
    cta: { url: "#", label: "Unirme a mi asesoría en línea", icono: "calendario" } } },
  { grupo: "Asesorías", nombre: "Asesoría cancelada", correo: {
    para: [""], asunto: "Tu asesoría fue cancelada — Cursos InMath", tono: "coral",
    preheader: "Tu asesoría se canceló; puedes reagendar.",
    texto: "Hola Fernando,\n\nTu asesoría del viernes 12 fue cancelada.\n\nMotivo: se traslapó con otra actividad del asesor.",
    cta: { url: "#", label: "Agendar de nuevo", icono: "calendario" } } },
  { grupo: "Asesorías", nombre: "Nueva asesoría (al staff)", correo: {
    para: [""], asunto: "Nueva asesoría agendada — Fernando Torres", tono: "azul",
    preheader: "Ya tiene enlace de Meet.",
    texto: "Un asesor tiene una asesoría agendada para el viernes 12, 17:00.\n\nProspecto: Fernando Torres\nWhatsApp: 5512345678\nCorreo: fernando@correo.com",
    cta: { url: "#", label: "Unirme a la asesoría en línea", icono: "calendario" } } },
  { grupo: "Asesorías", nombre: "⚠️ Asesorías sin enlace (al staff)", correo: {
    para: [""], asunto: "⚠️ URGENTE: 1 asesoría(s) siguen SIN enlace de Meet", tono: "coral",
    preheader: "Los reintentos no lo lograron — pégalo a mano.",
    texto: "• Fernando Torres — viernes 12, 17:00 (cita #45)",
    nota: "Genera el Meet a mano y pégalo en la ficha del prospecto — al guardarlo, el correo al cliente sale automático." } },
  { grupo: "Asesorías", nombre: "✅ Asesoría resuelta (al staff)", correo: {
    para: [""], asunto: "✅ Resuelto: la asesoría de Fernando Torres ya tiene su enlace", tono: "verde",
    preheader: "El enlace se generó y ya se le envió al cliente.",
    texto: "La asesoría del viernes 12, 17:00 (cita #45) ya tiene enlace de Meet y el cliente ya lo recibió por correo automáticamente.",
    cta: { url: "#", label: "Unirme a la asesoría en línea", icono: "calendario" } } },
  // ── Cuenta y seguridad ──
  { grupo: "Cuenta", nombre: "Código para entrar (2FA)", correo: {
    para: [""], asunto: "Tu código para entrar — Portal InMath", tono: "azul",
    preheader: "Tu código de acceso (vence en 10 minutos).",
    texto: "Hola Fernando,\n\nUsa este código para completar tu inicio de sesión en el portal.",
    codigo: "482913", nota: "Si no fuiste tú, ignora este correo — tu cuenta sigue segura." } },
  { grupo: "Cuenta", nombre: "Confirmar cambio de contraseña", correo: {
    para: [""], asunto: "Confirma el cambio de tu contraseña — Portal InMath", tono: "azul",
    preheader: "Tu código de confirmación (vence en 10 minutos).",
    texto: "Hola Fernando,\n\nRecibimos una solicitud para cambiar la contraseña de tu cuenta. Escribe este código en tu portal para confirmarla.",
    codigo: "739104", nota: "Si no fuiste tú, ignora este correo — tu contraseña no cambia sin el código." } },
  { grupo: "Cuenta", nombre: "Restablecer contraseña (portal)", correo: {
    para: [""], asunto: "Restablece tu contraseña — Portal InMath", tono: "azul",
    preheader: "Crea una contraseña nueva.",
    texto: "Hola Fernando,\n\nPara crear una contraseña nueva, toca el botón. El enlace expira en 15 minutos.",
    cta: { url: "#", label: "Crear contraseña nueva", icono: "candado" } } },
  { grupo: "Cuenta", nombre: "Restablecer contraseña (panel/staff)", correo: {
    para: [""], asunto: "Restablece tu contraseña — Inmath CRM", tono: "azul",
    preheader: "Crea una contraseña nueva para el panel.",
    texto: "Hola,\n\nPara crear una contraseña nueva del panel, toca el botón. El enlace expira en 15 minutos.",
    cta: { url: "#", label: "Crear contraseña nueva", icono: "candado" } } },
  { grupo: "Cuenta", nombre: "Cuenta lista (tras agendar)", correo: {
    para: [""], asunto: "Tu cuenta para Curso Propedéutico InMath está lista", tono: "verde",
    preheader: "Ya puedes entrar a tu portal.",
    texto: "Hola Fernando,\n\nCreamos tu cuenta. Entra a tu portal para ver tu curso, tus asesorías y tu material.",
    destacado: "Usuario: fernando@correo.com\nContraseña temporal: Xk48mple",
    cta: { url: "#", label: "Entrar a mi portal", icono: "candado" } } },
  { grupo: "Cuenta", nombre: "Baja de inscripción", correo: {
    para: [""], asunto: "Tu inscripción en Cursos InMath fue dada de baja", tono: "coral",
    preheader: "Tu inscripción fue dada de baja.",
    texto: "Hola Fernando,\n\nTu inscripción fue dada de baja.\n\nMotivo: solicitud del alumno." } },
  { grupo: "Cuenta", nombre: "Registro eliminado", correo: {
    para: [""], asunto: "Tu registro en Cursos InMath fue eliminado", tono: "coral",
    preheader: "Tu registro fue eliminado.",
    texto: "Hola Fernando,\n\nTu registro en Cursos InMath fue eliminado.\n\nMotivo: no completaste tu inscripción." } },
  // ── Sugerencias / avance / marketing ──
  { grupo: "Otros", nombre: "Sugerencia respondida (al alumno)", correo: {
    para: [""], asunto: "Respondimos tu pregunta — Portal InMath", tono: "azul",
    preheader: "El equipo respondió tu pregunta.",
    texto: 'Hola Fernando,\n\nEscribiste:\n"¿Cómo descargo mi reporte de avance?"\n\nJorge del equipo InMath te responde:\n"Entra a Reportes en tu portal y toca Descargar en el reporte de la semana."',
    cta: { url: "#", label: "Ver en mi portal", icono: "calendario" } } },
  { grupo: "Otros", nombre: "Nueva pregunta/recomendación (al admin)", correo: {
    para: [""], asunto: "Nueva PREGUNTA en el portal — Fernando Torres", tono: "azul",
    preheader: "¿Cómo descargo mi reporte de avance?",
    texto: 'Fernando Torres (fernando@correo.com) escribió desde su portal:\n\n"¿Cómo descargo mi reporte de avance?"',
    cta: { url: "#", label: "Abrir sugerencias del portal", icono: "calendario" } } },
  { grupo: "Otros", nombre: "Reporte semanal listo", correo: {
    para: [""], asunto: "Tu reporte de avance de la semana está listo", tono: "verde",
    preheader: "Ya está tu reporte semanal.",
    texto: "Hola Fernando,\n\nYa está tu reporte de avance de esta semana. Míralo en tu portal.",
    cta: { url: "#", label: "Ver mi reporte", icono: "calendario" } } },
  { grupo: "Otros", nombre: "Nueva duda desde la página (al staff)", correo: {
    para: [""], asunto: "Nueva duda desde la página — Fernando Torres", tono: "azul",
    preheader: "Un prospecto dejó una duda.",
    texto: "Fernando Torres (5512345678 · fernando@correo.com) preguntó desde la página:\n\n¿El curso incluye asesorías en fin de semana?" } },
  { grupo: "Otros", nombre: "Precio actualizado (al staff)", correo: {
    para: [""], asunto: "Actualizamos el precio de Curso Propedéutico InMath", tono: "azul",
    preheader: "Cambió el precio de un curso.",
    texto: "Se actualizó el precio del Curso Propedéutico InMath.\n\nAntes: $4,500 MXN\nAhora: $4,000 MXN" } },
  { grupo: "Otros", nombre: "Recordatorio de disponibilidad (al staff)", correo: {
    para: [""], asunto: "Define la disponibilidad de la próxima semana", tono: "ambar",
    preheader: "Aún no defines horarios para la próxima semana.",
    texto: "Recordatorio: todavía no defines los horarios de asesoría de la próxima semana. Sin ellos, /agenda y Mathy no podrán ofrecer citas.",
    cta: { url: "#", label: "Definir horarios", icono: "calendario" } } },
];

export default async function CorreosPreview() {
  await requiereAdmin();
  const items = CORREOS.map((c) => ({ grupo: c.grupo, nombre: c.nombre, asunto: c.correo.asunto, html: plantillaHtml(c.correo) }));
  return (
    <>
      <div className="cabecera">
        <div>
          <h1>Vista previa de correos</h1>
          <div className="sub">Los {items.length} correos que envía el sistema, con datos de ejemplo — para revisar y ajustar el diseño</div>
        </div>
      </div>
      <GaleriaCorreos items={items} />
    </>
  );
}
