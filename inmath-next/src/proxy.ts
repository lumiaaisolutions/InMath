import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy (antes "middleware", renombrado en Next 16): genera un nonce distinto
 * por request y lo publica en dos lugares:
 *  - el header `Content-Security-Policy` de la respuesta (`script-src
 *    'nonce-...'`, reemplaza el `'unsafe-inline'` que vivía en
 *    next.config.ts — ver docs/auditoria-ciberseguridad-2026-09.md, M-10).
 *  - el header `x-nonce` de la REQUEST (no de la respuesta), para que los
 *    Server Components lo lean con `headers()` de `next/headers` y lo pasen
 *    a cualquier <Script> propio con contenido inline (hoy solo
 *    src/components/MetaPixel.tsx).
 *
 * Next.js detecta el patrón `'nonce-...'` en el CSP de la respuesta y lo
 * aplica automáticamente a SUS PROPIOS scripts de hidratación (runtime de
 * Turbopack + payload RSC) sin que tengamos que tocarlos uno por uno — por
 * eso ya no hace falta 'unsafe-inline' para esos scripts.
 *
 * Importante: el nonce solo puede inyectarse en páginas renderizadas por
 * request (dynamic rendering). Las páginas estáticas (prerenderizadas en
 * build, sin request) no tienen nonce disponible al momento de generarse, así
 * que sus <script> de hidratación quedarían sin nonce y el CSP los
 * bloquearía. Las rutas que antes eran estáticas y quedan bajo este proxy se
 * forzaron a dynamic rendering explícitamente:
 *  - src/app/(sitio)/layout.tsx ahora lee headers() (eso ya vuelve dinámico
 *    todo ese grupo de rutas: /, /agenda, /pago, /terminos, /privacidad,
 *    /cookies, /codigo-conducta, /informacion-regulatoria, /referidos).
 *  - src/app/not-found.tsx y
 *    src/app/(panel)/panel/login/recuperar/page.tsx no usan headers(), así
 *    que llevan `export const dynamic = "force-dynamic"` explícito.
 */
const esDesarrollo = process.env.NODE_ENV !== "production";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const csp = [
    "default-src 'self'",
    // connect.facebook.net = script del píxel de Meta (fbevents.js); los
    // beacons del píxel van a www.facebook.com/tr (img-src y connect-src).
    `script-src 'self' 'nonce-${nonce}'${esDesarrollo ? " 'unsafe-eval'" : ""} https://static.cloudflareinsights.com https://connect.facebook.net`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://www.facebook.com",
    "media-src 'self'",
    "connect-src 'self' https://cloudflareinsights.com https://www.facebook.com https://connect.facebook.net",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Todo excepto rutas de API, estáticos de Next y favicon — esas
      // respuestas no son HTML con scripts propios, no necesitan CSP con
      // nonce (y las de API ya van sin CSP de por sí).
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
