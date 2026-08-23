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
      // Old backlink used a space instead of a hyphen in the filename.
      // Source matches the raw request path, so the space must stay percent-encoded.
      { source: "/pdfs/Donor%20Prospectus.pdf", destination: "/pdfs/Donor-Prospectus.pdf", permanent: true },
      // Malformed crawled URL: destination concatenated onto itself with no separator.
      // Next collapses the request's repeated "//" before matching, so only one
      // slash survives after the colon here.
      {
        source: "/global-ai-sentiment-2026https\\:/pauseai.uk/global-ai-sentiment-2026",
        destination: "/global-ai-sentiment-2026",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
