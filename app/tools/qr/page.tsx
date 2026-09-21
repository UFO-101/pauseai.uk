import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import NoAnalytics from "@/components/NoAnalytics";
import "../collateral/collateral.css";
import QrGenerator from "./QrGenerator";

// Volunteer tool: unlisted, kept out of search results and the sitemap (see HIDDEN_ROUTES in app/sitemap.ts).
export const metadata: Metadata = {
  title: "QR code generator",
  description: "Make a PauseAI UK QR code for any web address.",
  robots: { index: false, follow: false },
};

export default function QrPage() {
  return (
    <>
      <Nav />
      <NoAnalytics />
      <main className="collateral-page">
        <div className="container">
          <Link href="/tools" className="collateral-back">
            ← All tools
          </Link>
          <h1 className="collateral-title">QR code generator</h1>
          <p className="collateral-lede">
            Make a QR code for any web address and download it as a PNG or SVG. Everything happens in your browser. Making a whole
            flyer or post? Use the <Link href="/tools/collateral">collateral maker</Link>, which can add QR codes for you.
          </p>
          <QrGenerator />
        </div>
      </main>
    </>
  );
}
