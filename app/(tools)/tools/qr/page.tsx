import type { Metadata } from "next";
import Link from "next/link";
import ToolPage from "../collateral/_components/kit/ToolPage";
import QrGenerator from "./_components/QrGenerator";

// Volunteer tool: unlisted, kept out of search results and the sitemap (see HIDDEN_ROUTES in app/sitemap.ts).
export const metadata: Metadata = {
  title: "QR code generator",
  description: "Make a PauseAI UK QR code for any web address.",
  robots: { index: false, follow: false },
};

export default function QrPage() {
  return (
    <ToolPage
      title="QR code generator"
      lede={
        <>
          Make a QR code for any web address. Making a whole flyer or post? The{" "}
          <Link href="/tools/collateral">collateral maker</Link> adds QR codes for you.
        </>
      }
    >
      <QrGenerator />
    </ToolPage>
  );
}
