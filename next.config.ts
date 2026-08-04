import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Higgsfield delivery hosts — lets generated art be referenced directly
      // from the manifest before it is downloaded into /public/images.
      { protocol: "https", hostname: "**.higgsfield.ai" },
      { protocol: "https", hostname: "**.cloudfront.net" },
    ],
  },
  poweredByHeader: false,
};

export default nextConfig;
