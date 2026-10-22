import Footer from "@/components/layout/Footer";
import MarchBanner from "@/components/layout/MarchBanner";
import Nav from "@/components/layout/Nav";

// Public pages: the site header, then the page, then the footer. The cookie
// consent is in the root layout.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <MarchBanner />
      {children}
      <Footer />
    </>
  );
}
