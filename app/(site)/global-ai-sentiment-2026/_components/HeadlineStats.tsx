import { SURVEY_META } from "@/lib/content/aiSentiment2026";

// The survey's headline numbers.
export default function HeadlineStats() {
  return (
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
  );
}
