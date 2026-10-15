import MarchBanner from "@/components/layout/MarchBanner";
import Nav from "@/components/layout/Nav";
import NoAnalytics from "@/components/layout/NoAnalytics";

// Unlisted volunteer tools and trackers (hidden from the sitemap): the site
// header, and no analytics.
export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <MarchBanner />
      <NoAnalytics />
      {children}
    </>
  );
}
