import type { Metadata } from "next";
import Nav from "@/components/Nav";
import {
  GLOBAL_AVERAGE,
  GLOBAL_MOE_PP,
  GLOBAL_N,
  QUESTION_TEXT,
  RESPONSE_OPTIONS,
  SURVEY_META,
} from "@/lib/data/aiSentiment2026";
import WorldMap from "./WorldMap";
import CountryExplorer from "./CountryExplorer";
import DemographicsExplorer from "./DemographicsExplorer";
import "../track-record/track-record.css";
import "./global-ai-sentiment-2026.css";

const TITLE = "Global Attitudes to AI 2026";
const DESCRIPTION =
  "How 377,458 people across 104 countries feel about the development of superintelligent AI: an interactive look at the Nira Data Spring 2026 World Omnibus.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: `PauseAI UK | ${TITLE}`,
    description: DESCRIPTION,
    images: [
      {
        url: "/images/open-graph/open-graph-1200-630.jpg",
        width: 1200,
        height: 630,
      },
    ],
    url: "https://pauseai.uk/global-ai-sentiment-2026/",
  },
  twitter: {
    images: ["/images/open-graph/open-graph-1600-840.jpg"],
  },
  alternates: { canonical: "/global-ai-sentiment-2026" },
};

function buildLegendItems() {
  let cumPct = 0;
  return RESPONSE_OPTIONS.map((option) => {
    const value = GLOBAL_AVERAGE[option.key];
    const centerPct = cumPct + value / 2;
    cumPct += value;
    return { option, value, centerPct };
  });
}

const LEGEND_ITEMS = buildLegendItems();

export default function GlobalAiSentiment2026Page() {
  return (
    <>
      <Nav />
      <main className="track-record gas-page">
        <section className="tr-hero">
          <div className="container tr-hero-inner">
            <h1 className="tr-hero-title">{TITLE}</h1>
            <p className="gas-hero-lede">{DESCRIPTION}</p>
          </div>
        </section>

        <section className="gas-stats">
          <div className="container gas-stats-inner">
            <div className="gas-stat">
              <span className="gas-stat-value">
                {SURVEY_META.respondents.toLocaleString()}
              </span>
              <span className="gas-stat-label">Respondents</span>
            </div>
            <div className="gas-stat">
              <span className="gas-stat-value">{SURVEY_META.countries}</span>
              <span className="gas-stat-label">Countries surveyed</span>
            </div>
            <div className="gas-stat">
              <span className="gas-stat-value">60%</span>
              <span className="gas-stat-label">
                Want development slowed, paused or stopped
              </span>
            </div>
          </div>
        </section>

        <section className="gas-section">
          <div className="container">
            <h2>The question asked</h2>
            <blockquote className="gas-question">{QUESTION_TEXT}</blockquote>
            <p className="gas-key-stat">
              Six in ten people globally want AI development slowed in some
              form. Fewer than one in five want it developed &ldquo;as quickly
              as possible&rdquo;.
            </p>
            <div className="gas-global-header">
              <span className="gas-global-title">Global average</span>
              <span className="gas-global-meta">
                <span
                  className="gas-term"
                  data-tooltip="Number of people surveyed"
                >
                  n={GLOBAL_N.toLocaleString()}
                </span>
                {" · "}
                <span
                  className="gas-term"
                  data-tooltip="Margin of error at 95% confidence, in percentage points"
                >
                  &plusmn;{GLOBAL_MOE_PP}pp
                </span>
                {" (approx.)"}
              </span>
            </div>
            <div className="gas-global-display">
              <div className="gas-vbar-col">
                <div
                  className="gas-vbar-wrap"
                  role="img"
                  aria-label={`Global average: ${RESPONSE_OPTIONS.map((o) => `${o.shortLabel} ${GLOBAL_AVERAGE[o.key]}%`).join(", ")}`}
                >
                  {LEGEND_ITEMS.map(({ option, value }) => (
                    <div
                      key={option.key}
                      className="gas-vbar-segment"
                      style={{ flex: value, background: option.light }}
                    >
                      {value >= 7 && (
                        <span className="gas-vbar-segment-value">{value}%</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="gas-vbar-right">
                <div className="gas-vbar-legend">
                  {LEGEND_ITEMS.map(({ option, centerPct }) => (
                    <div
                      key={option.key}
                      className="gas-vbar-legend-item"
                      style={{ top: `${centerPct}%` }}
                    >
                      <span
                        className="gas-vbar-dot"
                        style={{ background: option.light }}
                      />
                      <span className="gas-vbar-label">{option.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
            <p className="gas-section-intro">
              Hover any country to see its full breakdown.
            </p>
            <WorldMap />
          </div>
        </section>

        <section className="gas-section">
          <div className="container">
            <h2>All 104 countries</h2>
            <p className="gas-section-intro">
              Filter by region, sort by opinion, or search for a country.
            </p>
            <CountryExplorer />
          </div>
        </section>

        <section className="gas-section gas-section-muted">
          <div className="container">
            <h2>By demographic</h2>
            <p className="gas-section-intro">
              Regional averages and demographic breakdowns from the survey,
              including a UK/US deep dive.
            </p>
            <DemographicsExplorer />
          </div>
        </section>

        <section className="gas-section gas-methodology">
          <div className="container">
            <h2>Methodology</h2>
            <p>
              Data from {SURVEY_META.publisher}&rsquo;s Spring 2026 World
              Omnibus: {SURVEY_META.respondents.toLocaleString()} respondents
              across {SURVEY_META.countries} countries, surveyed online and
              weighted to national benchmarks, fieldwork performed from{" "}
              {SURVEY_META.fieldwork}. Margins of error per country are shown
              alongside each result. PauseAI UK did not commission this survey.
              We are republishing it because it is the most comprehensive recent
              look at global public opinion on AI development.
            </p>
            <p>
              <a href={SURVEY_META.reportUrl} target="_blank" rel="noreferrer">
                View the full report
              </a>{" "}
              for the executive summary, questionnaire and full regional
              analysis.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
