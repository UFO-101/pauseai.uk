import { pageMetadata } from "@/lib/metadata";
import { QUESTION_TEXT, SURVEY_META } from "@/lib/content/aiSentiment2026";
import WorldMap from "./_components/WorldMap";
import CountryExplorer from "./_components/CountryExplorer";
import DemographicsExplorer from "./_components/DemographicsExplorer";
import GlobalAverageBar from "./_components/GlobalAverageBar";
import "../track-record/track-record.css";
import "./global-ai-sentiment-2026.css";
import HeadlineStats from "./_components/HeadlineStats";
import Methodology from "./_components/Methodology";
import PageHero from "@/components/ui/PageHero";

const TITLE = "Global Attitudes to AI 2026";
const DESCRIPTION =
  "How 377,458 people across 104 countries feel about the development of superintelligent AI: an interactive look at the Nira Data Spring 2026 World Omnibus.";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/global-ai-sentiment-2026",
});

export default function GlobalAiSentiment2026Page() {
  return (
    <>
      <main className="track-record gas-page">
        <PageHero title={TITLE}>
          <p className="gas-hero-lede">{DESCRIPTION}</p>
        </PageHero>

        <HeadlineStats />

        <section className="gas-section">
          <div className="container">
            <h2>The question asked</h2>
            <blockquote className="gas-question">{QUESTION_TEXT}</blockquote>
            <p className="gas-key-stat">
              Six in ten people globally want AI development slowed in some form. Fewer than one in five want it
              developed &ldquo;as quickly as possible&rdquo;.
            </p>
            <GlobalAverageBar />
            <p className="gas-source-note">
              <a href={SURVEY_META.reportUrl} target="_blank" rel="noreferrer">
                Read the full report
              </a>
              .
            </p>
          </div>
        </section>

        <section className="gas-section gas-section-muted">
          <div className="container">
            <h2>Explore the map</h2>
            <p className="gas-section-intro">Select a country to see its full breakdown.</p>
            <WorldMap />
          </div>
        </section>

        <section className="gas-section">
          <div className="container">
            <h2>By demographic</h2>
            <DemographicsExplorer />
          </div>
        </section>

        <section className="gas-section gas-section-muted">
          <div className="container">
            <h2>All 104 countries</h2>
            <CountryExplorer />
          </div>
        </section>

        <Methodology />
      </main>
    </>
  );
}
