import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Support large file uploads (50MB)
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
    proxyClientMaxBodySize: "50mb",
  },
};

export default nextConfig;
