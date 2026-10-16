import { pageMetadata } from "@/lib/metadata";
import EvidenceSubmission from "./_components/EvidenceSubmission";
import FootnoteTooltips from "./_components/FootnoteTooltips";
import Foreword from "./_components/Foreword";
import "./page.css";
import PageHero from "@/components/ui/PageHero";

export const metadata = pageMetadata({
  title: "Evidence: AI, Business and the Future of the Workforce",
  description:
    "PauseAI UK's written submission to the House of Commons Business and Trade Committee inquiry into Artificial Intelligence, business and the future of the workforce.",
  path: "/future-of-workforce-inquiry",
});

export default function AIWorkforceEvidencePage() {
  return (
    <>
      <main className="evidence-submission">
        <PageHero
          title="AI, Business and the Future of the Workforce"
          lede={<>PauseAI UK&rsquo;s submission to the House of Commons Business and Trade Committee, April 2026</>}
        />

        <Foreword />

        <EvidenceSubmission />
      </main>

      <FootnoteTooltips />
    </>
  );
}
