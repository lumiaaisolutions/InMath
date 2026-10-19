import type { NextConfig } from "next";

/** Cabeceras de seguridad (hardening N2). Se aplican a todas las respuestas.
 *  El Content-Security-Policy YA NO vive aquí: se mueve a src/proxy.ts
 *  porque ahora lleva un nonce distinto por request (reemplaza el
 *  `'unsafe-inline'` de script-src — ver M-10 en
 *  docs/auditoria-ciberseguridad-2026-09.md). Las cabeceras estáticas que
 *  no dependen del request se quedan en next.config.ts como antes. */
const securityHeaders = [
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
