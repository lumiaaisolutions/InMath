import type { NextConfig } from "next";

/** Cabeceras de seguridad (hardening N2). Se aplican a todas las respuestas.
 *  NOTA: no se añade una CSP estricta aquí porque requiere pruebas por página
 *  (estilos/imagenes inline); queda como recomendación de seguimiento. Sí se
 *  cubren clickjacking, sniffing, referrer, permisos y HSTS. */
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
      // El comprobante de /pago acepta hasta 8 MB + sobrecarga multipart.
      bodySizeLimit: "9mb",
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
