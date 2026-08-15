import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },

  // 👇 Agrega esto para permitir acceso desde tu IP
  allowedDevOrigins: ["10.10.1.100"],
};

export default nextConfig;
