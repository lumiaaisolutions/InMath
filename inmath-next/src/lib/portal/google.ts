/**
 * OAuth con Google (Authorization Code) para el portal del alumno. Solo pide
 * identidad (openid/email/profile) — NO es el OAuth de Google Calendar de n8n.
 * Degrada con gracia: si faltan GOOGLE_CLIENT_ID/SECRET, googleConfigurado()
 * es false y el botón no se muestra (mismo patrón que SMTP/MercadoPago).
 */
function redirectUri(): string {
  return (process.env.APP_URL ?? "").replace(/\/$/, "") + "/api/portal/google/callback";
}

export function googleAuthUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

type PerfilGoogle = { email: string; emailVerificado: boolean; nombre: string | null };

/** Canjea el `code` por el id_token y devuelve el correo verificado. */
export async function googlePerfilDesdeCodigo(code: string): Promise<PerfilGoogle | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }).toString(),
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status !== 200) return null;
  const datos = await res.json().catch(() => ({}));
  const idToken: string | undefined = datos.id_token;
  if (!idToken) return null;

  // El id_token viene directo del endpoint de Google sobre TLS (no del cliente),
  // así que decodificar el payload sin re-verificar la firma es correcto aquí.
  const partes = idToken.split(".");
  if (partes.length !== 3) return null;
  let payload: { email?: string; email_verified?: boolean | string; name?: string };
  try {
    payload = JSON.parse(Buffer.from(partes[1], "base64url").toString("utf8"));
  } catch { return null; }
  if (!payload.email) return null;
  return {
    email: String(payload.email).toLowerCase(),
    emailVerificado: payload.email_verified === true || payload.email_verified === "true",
    nombre: payload.name ?? null,
  };
}

/** URL de autorización para CONECTAR GOOGLE CALENDAR (respaldo directo del
 *  link de Meet, ver src/lib/google-calendar.ts). Mismo cliente y mismo
 *  redirect que el login — solo cambian el scope (calendar.events) y
 *  access_type=offline + prompt=consent para recibir un refresh token. El
 *  state lleva el prefijo "gcal_" y el callback lo usa para distinguir esta
 *  rama del login normal. */
export function googleAuthUrlCalendar(state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email https://www.googleapis.com/auth/calendar.events",
    state,
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

/** Canjea el `code` de la rama de Calendar: devuelve refresh token + correo
 *  de la cuenta autorizada (para mostrar cuál quedó conectada). */
export async function googleTokensCalendarDesdeCodigo(code: string): Promise<{ refreshToken: string; email: string } | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }).toString(),
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status !== 200) return null;
  const datos = await res.json().catch(() => ({}));
  if (!datos.refresh_token || !datos.id_token) return null;
  const partes = String(datos.id_token).split(".");
  if (partes.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(partes[1], "base64url").toString("utf8"));
    if (!payload.email) return null;
    return { refreshToken: datos.refresh_token, email: String(payload.email).toLowerCase() };
  } catch { return null; }
}
