import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The current app uses regular image elements, not next/image.
  // Add a strict, owned-host allowlist before introducing Next.js image optimization.
  // Keep the standard Next.js output so "next start" and Vercel use the same runtime contract.
  headers: async () => [
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
