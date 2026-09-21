import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import NoAnalytics from "@/components/NoAnalytics";
import "./tools.css";

// Volunteer area: unlisted, kept out of search results and the sitemap (see HIDDEN_ROUTES in app/sitemap.ts).
export const metadata: Metadata = {
  title: "Volunteer tools",
  description: "Tools for PauseAI UK volunteers to create branded designs.",
  robots: { index: false, follow: false },
};

const tools = [
  {
    href: "/tools/collateral",
    title: "Collateral maker",
    description:
      "Make PauseAI UK branded flyers, posters, event and social media images. Pick a format and a style, add your text, photo and QR codes, then download a PNG or a print-ready PDF.",
  },
  {
    href: "/tools/qr",
    title: "QR code generator",
    description: "Make a QR code for any web address, with an optional PauseAI pause symbol in the middle. Download it as a PNG or an SVG.",
  },
];

export default function ToolsPage() {
  return (
    <>
      <Nav />
      <NoAnalytics />
      <main className="tools-page">
        <div className="container">
          <h1 className="tools-title">Tools</h1>
          <p className="tools-lede">
            We have tools available for our volunteers to create PauseAI branded designs for their online event listings, flyers, and
            more.
          </p>
          <ul className="tools-grid">
            {tools.map((tool) => (
              <li key={tool.href}>
                <Link href={tool.href} className="tools-card">
                  <h2>{tool.title}</h2>
                  <p>{tool.description}</p>
                  <span className="tools-card-cta" aria-hidden="true">
                    Open →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
}
