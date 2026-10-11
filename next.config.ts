import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root (a stray lockfile in a parent directory otherwise confuses detection).
  outputFileTracingRoot: __dirname,
  experimental: {
    // project photos (up to 8 × 5 MB) are uploaded through a server action; the default limit is 1 MB
    serverActions: { bodySizeLimit: "45mb" },
  },
};

export default nextConfig;
