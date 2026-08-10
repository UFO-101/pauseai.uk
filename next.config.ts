import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Luma event cover images (components/EventList.tsx)
      { protocol: "https", hostname: "images.lumacdn.com" },
    ],
  },
};

export default nextConfig;
