import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** Required by the static export target; harmless in the server build. */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/api/" }],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
