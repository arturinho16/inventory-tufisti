import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },

  // 👇 Agrega esto para permitir acceso desde tu IP
  allowedDevOrigins: ["10.10.1.100"],
};

export default nextConfig;

