import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Luma event cover images (components/EventList.tsx)
      { protocol: "https", hostname: "images.lumacdn.com" },
    ],
  },
  async redirects() {
    return [
      // The stories section moved to /people; shared story permalinks
      // (CopyLinkButton) predate the rename and must keep resolving.
      { source: "/stories", destination: "/people", permanent: true },
      { source: "/stories/:slug", destination: "/people/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
