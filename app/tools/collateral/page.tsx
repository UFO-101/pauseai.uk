import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import NoAnalytics from "@/components/NoAnalytics";
import CollateralStudio from "./CollateralStudio";
import "./collateral.css";

// Volunteer tool: unlisted, kept out of search results and the sitemap (see HIDDEN_ROUTES in app/sitemap.ts).
export const metadata: Metadata = {
  title: "Collateral maker",
  description: "Make on-brand flyers, event covers and social posts for PauseAI UK.",
  robots: { index: false, follow: false },
};

export default function CollateralPage() {
  return (
    <>
      <Nav />
      <NoAnalytics />
      <main className="collateral-page">
        <div className="container">
          <Link href="/tools" className="collateral-back">
            ← All tools
          </Link>
          <h1 className="collateral-title">Collateral maker</h1>
          <p className="collateral-lede">
            Pick a format and a style, fill in the text, and download. Everything happens in your browser, so nothing is uploaded.
            Just need a QR code? Use the <Link href="/tools/qr">QR code generator</Link>.
          </p>
          <CollateralStudio />
        </div>
      </main>
    </>
  );
}
