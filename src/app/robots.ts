import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Personal surfaces should never be indexed.
        disallow: ["/account", "/bookings", "/messages", "/dashboard", "/admin", "/book", "/auth"],
      },
    ],
    sitemap: "https://booknow.demo/sitemap.xml",
  };
}
