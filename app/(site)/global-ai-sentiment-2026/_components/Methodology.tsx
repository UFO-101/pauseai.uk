import { SURVEY_META } from "@/lib/content/aiSentiment2026";

// How the survey was run and weighted.
export default function Methodology() {
  return (
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
  );
}
