import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The current app uses regular image elements, not next/image.
  // Add a strict, owned-host allowlist before introducing Next.js image optimization.
  // Keep the standard Next.js output so "next start" and Vercel use the same runtime contract.
  headers: async () => [
    {
      // Kigali pack files are requested with ?v=<build>, so they can be cached for a long time.
      source: "/kigali/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
    {
      source: "/kigali/index.json",
      headers: [{ key: "Cache-Control", value: "public, max-age=300, s-maxage=300, stale-while-revalidate=3600" }],
    },
    {
      source: "/sw.js",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=0, must-revalidate",
        },
        {
          key: "Service-Worker-Allowed",
          value: "/",
        },
      ],
    },
  ],
};

export default nextConfig;
