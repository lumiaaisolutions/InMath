import type { NextConfig } from "next";

/** Content-Security-Policy (enforcing). Inventario real de recursos externos:
 *  solo Google Fonts (hoja de estilo + woff2) — no hay scripts de terceros.
 *  `unsafe-inline` en script-src es necesario para los scripts de hidratación
 *  de Next.js (sin infra de nonce); aún así la CSP bloquea TODA carga de
 *  scripts externos, iframes, objetos y form-actions a otros orígenes. */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  "connect-src 'self'",
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
      // El comprobante de /pago acepta hasta 8 MB + sobrecarga multipart.
      bodySizeLimit: "9mb",
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
