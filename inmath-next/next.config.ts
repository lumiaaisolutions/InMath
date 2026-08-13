import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // El comprobante de /pago acepta hasta 8 MB + sobrecarga multipart.
      bodySizeLimit: "9mb",
    },
  },
};

export default nextConfig;
