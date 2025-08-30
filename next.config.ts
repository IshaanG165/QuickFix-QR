import type { NextConfig } from "next";

// Derive Supabase host from env to allow Next/Image signed URLs from Storage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseHost: string | undefined;
try {
  if (supabaseUrl) {
    supabaseHost = new URL(supabaseUrl).hostname;
  }
} catch {
  // ignore parse errors; images rule will just not be added
}

const nextConfig: NextConfig = {
  turbopack: {
    // Set workspace root explicitly to avoid multiple lockfile warning
    root: __dirname,
  },
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            // Allow all objects under storage (covers signed and public URLs)
            pathname: "/storage/v1/object/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
