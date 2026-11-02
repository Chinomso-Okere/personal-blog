import type { NextConfig } from "next";

const isWindows = process.platform === "win32";

const nextConfig: NextConfig = {
  experimental: {
    ...(isWindows
      ? { turbopackPluginRuntimeStrategy: "forceWorkerThreads" }
      : {}),
  },
};

export default nextConfig;
