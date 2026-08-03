import type { MetadataRoute } from "next";

// Emitted as a real file by the static export.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: "https://ashgrovebarber.co/sitemap.xml",
  };
}
