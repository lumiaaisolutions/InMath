import { prisma } from "@/lib/db";
import { isoMinuto } from "@/lib/fechas";

/**
 * Respaldo DIRECTO de Google Calendar + Meet (sin pasar por n8n).
 *
 * Cadena de creación del link de una cita (ver agenda.ts):
 *   1) n8n (workflow 03) — el "robot" titular.
 *   2) ESTE módulo — si n8n falla, el sitio crea el evento él mismo con la
 *      cuenta de Google del negocio (cursosinmath@gmail.com).
 *   3) Si ambos fallan: alerta roja en el panel + correo urgente al staff y
 *      reintentos automáticos (api/citas/reparar-links).
 *
 * Autorización: reutiliza el MISMO cliente OAuth del login con Google
 * (GOOGLE_CLIENT_ID/SECRET y el redirect /api/portal/google/callback), pero
 * con scope de Calendar y access_type=offline. El refresh token se guarda en
 * la tabla `configuraciones` (clave google_calendar_refresh) al pulsar
 * "Conectar Google Calendar" en /panel/configuracion — es un paso ÚNICO que
 * hace el dueño con la cuenta cursosinmath@gmail.com.
 */

const CLAVE_REFRESH = "google_calendar_refresh";
const CLAVE_CUENTA = "google_calendar_cuenta";

export async function calendarDirectoConfigurado(): Promise<boolean> {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return false;
  const fila = await prisma.configuraciones.findUnique({ where: { clave: CLAVE_REFRESH } });
  return Boolean(fila?.valor);
}

export async function calendarCuentaConectada(): Promise<string | null> {
  const fila = await prisma.configuraciones.findUnique({ where: { clave: CLAVE_CUENTA } });
  return fila?.valor ?? null;
}

export async function guardarCredencialCalendar(refreshToken: string, cuenta: string, usuarioId: number | null) {
  const datos = (clave: string, valor: string, descripcion: string) => ({
    where: { clave },
    update: { valor, actualizado_por: usuarioId },
    create: { clave, valor, tipo: "texto" as const, descripcion, actualizado_por: usuarioId },
  });
  await prisma.configuraciones.upsert(datos(CLAVE_REFRESH, refreshToken, "Refresh token OAuth para crear eventos de Calendar/Meet (respaldo directo sin n8n)"));
  await prisma.configuraciones.upsert(datos(CLAVE_CUENTA, cuenta, "Cuenta de Google conectada para el calendario de asesorías"));
}

async function accessTokenCalendar(): Promise<string | null> {
  const fila = await prisma.configuraciones.findUnique({ where: { clave: CLAVE_REFRESH } });
  if (!fila?.valor) return null;
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        refresh_token: fila.valor,
        grant_type: "refresh_token",
      }).toString(),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status !== 200) {
      // B-18: solo el código de estado — el cuerpo de la respuesta de Google
      // no se loguea completo (podría traer detalles de la cuenta/token).
      console.error("google-calendar: refresh rechazado, status", res.status);
      return null;
    }
    const datos = await res.json().catch(() => ({}));
    return datos.access_token ?? null;
  } catch (e) {
    console.error("google-calendar: no se pudo refrescar el token", e);
    return null;
  }
}

/** Crea el evento (con sala de Meet) directamente en el calendario primario
 *  de la cuenta conectada. Devuelve el link de Meet o null si algo falla —
 *  nunca lanza: quien llama decide el siguiente paso de la cadena. */
export async function crearEventoDirecto(cita: { id: number; inicio: Date; fin: Date }, prospectoNombre: string | null): Promise<{ link: string; eventId: string | null } | null> {
  const token = await accessTokenCalendar();
  if (!token) return null;
  // Las horas de la agenda son "pared-UTC" (ver fechas.ts): SIEMPRE se leen
  // con getUTC*, nunca con getters locales — si no, el resultado depende de
  // en qué TZ corra el proceso Node y puede desfasarse silenciosamente.
  const iso = (d: Date) => `${isoMinuto(d).replace(" ", "T")}:00`;
  try {
    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: `Asesoría InMath — ${prospectoNombre ?? "prospecto"}`,
          description: `Asesoría 1 a 1 agendada desde el sitio (cita #${cita.id}).`,
          start: { dateTime: iso(cita.inicio), timeZone: "America/Mexico_City" },
          end: { dateTime: iso(cita.fin), timeZone: "America/Mexico_City" },
          conferenceData: { createRequest: { requestId: `inmath-cita-${cita.id}`, conferenceSolutionKey: { type: "hangoutsMeet" } } },
        }),
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (res.status < 200 || res.status >= 300) {
      // B-18: idem — solo status, sin el cuerpo completo de la respuesta.
      console.error("google-calendar: crear evento falló, status", res.status);
      return null;
    }
    const evento = await res.json().catch(() => ({}));
    const meet: string | undefined =
      evento.hangoutLink ??
      evento.conferenceData?.entryPoints?.find((e: { entryPointType?: string; uri?: string }) => e.entryPointType === "video")?.uri;
    return meet ? { link: meet, eventId: evento.id ?? null } : null;
  } catch (e) {
    console.error("google-calendar: crear evento no respondió", e);
    return null;
  }
}

/** Borra un evento del calendario conectado — limpieza cuando dos caminos
 *  (robot n8n y respaldo directo) crearon evento para la MISMA cita: el que
 *  pierde la carrera se elimina para que nunca queden duplicados. */
export async function borrarEventoDirecto(eventId: string): Promise<boolean> {
  const token = await accessTokenCalendar();
  if (!token) return false;
  try {
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    });
    return res.status === 204 || res.status === 200 || res.status === 410;
  } catch (e) {
    console.error("google-calendar: no se pudo borrar el evento duplicado", e);
    return false;
  }
}
