import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbopackPluginRuntimeStrategy: "forceWorkerThreads",
  },
};

export default nextConfig;
