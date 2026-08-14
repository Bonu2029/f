import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Business media is rendered through the local <Media /> primitive today.
    // When a real CDN/Supabase Storage bucket is wired up, add its host here.
    remotePatterns: [],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
