import Image from "next/image";

// The open letter and the policy briefing, as cards.
export default function CampaignDocs() {
  return (
    <section className="campaigns-docs">
      <div className="container">
        <h2>Read the case in full</h2>
        <div className="docs-grid">
          <a className="doc-card" href="/pdfs/Frontier-AI-Open-Letter.pdf" target="_blank" rel="noreferrer">
            <Image src="/pdfs/Frontier-AI-Open-Letter.jpg" alt="" width={2550} height={3300} loading="lazy" />
            <div className="doc-meta">
              <p className="doc-kind">Open letter &mdash; June 2026</p>
              <h3>To the Prime Minister</h3>
              <span className="doc-cta">Read the letter &rarr;</span>
            </div>
          </a>
          <a className="doc-card" href="/pdfs/Frontier-AI-Risks-Policy-Briefing.pdf" target="_blank" rel="noreferrer">
            <Image src="/pdfs/Frontier-AI-Risks-Policy-Briefing.jpg" alt="" width={2550} height={3300} loading="lazy" />
            <div className="doc-meta">
              <p className="doc-kind">Policy briefing &mdash; June 2026</p>
              <h3>Frontier AI Risks</h3>
              <span className="doc-cta">Read the briefing &rarr;</span>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
