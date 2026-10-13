import Nav from "@/components/Nav";
import NoAnalytics from "@/components/NoAnalytics";

// Unlisted volunteer tools and trackers (hidden from the sitemap): the site
// header, and no analytics.
export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <NoAnalytics />
      {children}
    </>
  );
}
