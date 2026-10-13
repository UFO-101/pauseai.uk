import type { Metadata } from "next";
import ToolGrid from "./_components/ToolGrid";
import "./tools.css";

// Volunteer area: unlisted, kept out of search results and the sitemap (see HIDDEN_ROUTES in app/sitemap.ts).
export const metadata: Metadata = {
  title: "Volunteer tools",
  description: "Tools for PauseAI UK volunteers to create branded designs.",
  robots: { index: false, follow: false },
};

export default function ToolsPage() {
  return (
    <>
      <main className="tools-page">
        <div className="container">
          <h1 className="tools-title">Tools</h1>
          <p className="tools-lede">
            We have tools available for our volunteers to create PauseAI branded designs for their online event listings, flyers, and
            run projects with others.
          </p>
          <ToolGrid />
        </div>
      </main>
    </>
  );
}
