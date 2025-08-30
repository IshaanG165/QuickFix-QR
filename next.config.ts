import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    // Set workspace root explicitly to avoid multiple lockfile warning
    root: __dirname,
  },
};

export default nextConfig;
