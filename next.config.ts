import type { NextConfig } from "next";

const isWindows = process.platform === "win32";

const nextConfig: NextConfig = {
  // Admin pages and API responses must never be indexed, including JSON and
  // redirects that carry no HTML robots meta tag.
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [
      { source: "/admin/:path*", headers: noindex },
      { source: "/admin", headers: noindex },
      { source: "/api/:path*", headers: noindex },
    ];
  },
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
