import type { MetadataRoute } from "next";

const SITE_URL = "https://iwacu-rwanda-2.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/ads.txt"],
        disallow: ["/admin/", "/api/"],
      },
    ],
    sitemap: SITE_URL.replace(/\/$/, "") + "/sitemap.xml",
    host: SITE_URL,
  };
}
