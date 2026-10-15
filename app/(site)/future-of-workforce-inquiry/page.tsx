import { pageMetadata } from "@/lib/metadata";
import EvidenceSubmission from "./_components/EvidenceSubmission";
import FootnoteTooltips from "./_components/FootnoteTooltips";
import Foreword from "./_components/Foreword";
import "../track-record/track-record.css";
import "./page.css";

export const metadata = pageMetadata({
  title: "Evidence: AI, Business and the Future of the Workforce",
  description:
    "PauseAI UK's written submission to the House of Commons Business and Trade Committee inquiry into Artificial Intelligence, business and the future of the workforce.",
  path: "/future-of-workforce-inquiry",
});

export default function AIWorkforceEvidencePage() {
  return (
    <>
      <main className="track-record evidence-submission">
        <section className="tr-hero">
          <div className="container tr-hero-inner">
            <h1 className="tr-hero-title">AI, Business and the Future of the Workforce</h1>
            <p className="tr-hero-lede">
              PauseAI UK&rsquo;s submission to the House of Commons Business and Trade Committee, April 2026
            </p>
          </div>
        </section>

        <Foreword />

        <EvidenceSubmission />
      </main>

      <FootnoteTooltips />
    </>
  );
}
