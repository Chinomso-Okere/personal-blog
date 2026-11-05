import type { NextConfig } from "next";

const isWindows = process.platform === "win32";

const nextConfig: NextConfig = {
  images: {
    // 90 is used for cover diagrams, whose small text goes soft at 75.
    qualities: [75, 90],
  },
  experimental: {
    ...(isWindows
      ? { turbopackPluginRuntimeStrategy: "forceWorkerThreads" }
      : {}),
  },
};

export default nextConfig;
