import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deploy en VPS: server.js autocontenido en .next/standalone (ver docs/despliegue-vps.md).
  output: "standalone",
  experimental: {
    serverActions: {
      // El comprobante de /pago acepta hasta 8 MB + sobrecarga multipart.
      bodySizeLimit: "9mb",
    },
  },
};

export default nextConfig;
