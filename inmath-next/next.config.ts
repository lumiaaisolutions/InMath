import type { NextConfig } from "next";

/** Content-Security-Policy (enforcing). Inventario real de recursos externos:
 *  Google Fonts (hoja de estilo + woff2) y el beacon de Cloudflare (que el
 *  proxy de Cloudflare inyecta automáticamente en todo el sitio, fuera de
 *  nuestro control — dominio oficial de Cloudflare, sin riesgo real).
 *  `unsafe-inline` en script-src es necesario para los scripts de hidratación
 *  de Next.js (sin infra de nonce); aún así la CSP bloquea TODA carga de
 *  scripts externos no listados, iframes, objetos y form-actions externos. */
// React (solo en desarrollo) usa eval() para reconstruir callstacks; con la
// CSP enforzada eso pinta un error en consola y el badge "1 Issue" del dev
// overlay. En producción React no usa eval jamás, así que 'unsafe-eval' NUNCA
// se emite en el build de producción.
const esDesarrollo = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${esDesarrollo ? " 'unsafe-eval'" : ""} https://static.cloudflareinsights.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  "connect-src 'self' https://cloudflareinsights.com",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

/** Cabeceras de seguridad (hardening N2). Se aplican a todas las respuestas. */
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  // Deploy en VPS: server.js autocontenido en .next/standalone (ver docs/despliegue-vps.md).
  output: "standalone",
  // No revelar el framework/versión en las respuestas (X-Powered-By).
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // El límite real más grande hoy es Materiales (documento/video hasta 60MB,
      // ver MAX_ARCHIVO en materiales/acciones.ts) — antes este límite estaba en
      // 9mb (pensado solo para el comprobante de /pago de 8MB) y rechazaba en
      // silencio cualquier archivo mayor ANTES de que el código de la app
      // pudiera dar un mensaje de error claro (se veía como un 403 genérico).
      bodySizeLimit: "65mb",
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
