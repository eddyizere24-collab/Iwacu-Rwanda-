import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Service Worker is served from /public/sw.js
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
