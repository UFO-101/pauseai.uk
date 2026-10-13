import Nav from "@/components/Nav";

// Public pages: the site header, then the page. The footer and cookie
// consent are in the root layout.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {children}
    </>
  );
}
