import type { NextConfig } from "next";

const isWindows = process.platform === "win32";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/draft": ["./content/writing-instructions.md"],
  },
  experimental: {
    ...(isWindows
      ? { turbopackPluginRuntimeStrategy: "forceWorkerThreads" }
      : {}),
  },
};

export default nextConfig;
