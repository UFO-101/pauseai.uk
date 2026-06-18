import type { Metadata } from "next";
import Nav from "@/components/Nav";
import CampaignsClient from "./CampaignsClient";
import "./campaigns.css";

export const metadata: Metadata = {
  title: "PauseAI UK | Campaigns",
  description: "Take action on AI safety. Email your MP, join campaigns, and help build pressure for a global pause.",
  openGraph: {
    title: "PauseAI UK | Campaigns",
    description: "Take action on AI safety. Email your MP, join campaigns, and help build pressure for a global pause.",
    images: [{ url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 }],
    url: "https://pauseai.uk/campaigns/",
  },
  twitter: {
    images: ["/images/open-graph/open-graph-1600-840.jpg"],
  },
};

export default function CampaignsPage() {
  return (
    <>
      <Nav />
      <main className="campaigns">
        <section className="campaigns-hero">
          <div className="container">
            <p className="eyebrow">Frontier AI Legislation Campaign</p>
            <h1>Regulate AI developers now</h1>
            <p className="lede">We&rsquo;re calling on the UK government to introduce legislation to protect British people from frontier AI risks: from cyber attacks on national infrastructure to bioweapons.</p>
            <p className="hero-cta-row">
              <a className="btn primary" href="#email-your-mp">Email your MP &rarr;</a>
            </p>
          </div>
        </section>

        <section className="campaigns-context">
          <div className="container">
            <p>In February of this year, a lone criminal used commercially available AI tools to carry out cyber attacks on nine Mexican government agencies and exfiltrate hundreds of millions of citizen records. The UK&rsquo;s own AI Security Institute has found that today&rsquo;s most advanced models can <em>&ldquo;discover and exploit vulnerabilities autonomously &mdash; tasks that would take human professionals days of work&rdquo;</em>. Britain depends on the same critical infrastructure these tools can now attack.</p>
            <p>The UK has no specific legal standards for AI. No regulator oversees frontier AI development. And UK law does not reliably hold developers liable for damage or deaths caused by their models, even when the danger is predictable, preventable and uniquely enabled by AI. In short, <strong>UK law neither requires developers to guard against frontier AI risks, nor exposes them to any financial consequence if they fail to do so.</strong></p>
            <p>Given the pace at which AI capabilities are advancing, this matter cannot wait. We urge the Prime Minister to introduce legislation to guard against the risks of frontier AI systems.</p>
          </div>
        </section>

        <section className="campaigns-docs">
          <div className="container">
            <h2>Read the case in full</h2>
            <div className="docs-grid">
              <a className="doc-card" href="/pdfs/Frontier-AI-Open-Letter.pdf" target="_blank" rel="noreferrer">
                <img src="/pdfs/Frontier-AI-Open-Letter.jpg" alt="" loading="lazy" />
                <div className="doc-meta">
                  <p className="doc-kind">Open letter &mdash; June 2026</p>
                  <h3>To the Prime Minister</h3>
                  <span className="doc-cta">Read the letter &rarr;</span>
                </div>
              </a>
              <a className="doc-card" href="/pdfs/Frontier-AI-Risks-Policy-Briefing.pdf" target="_blank" rel="noreferrer">
                <img src="/pdfs/Frontier-AI-Risks-Policy-Briefing.jpg" alt="" loading="lazy" />
                <div className="doc-meta">
                  <p className="doc-kind">Policy briefing &mdash; June 2026</p>
                  <h3>Frontier AI Risks</h3>
                  <span className="doc-cta">Read the briefing &rarr;</span>
                </div>
              </a>
            </div>
          </div>
        </section>

        <section id="email-your-mp" className="campaigns-embed">
          <div className="container">
            <h2>Email your MP</h2>
            <div className="embed-frame">
              <iframe
                id="campaigns-embed"
                src="https://pauseai.info/embed/uk-email-mp"
                title="Email your MP — PauseAI"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
            <p className="embed-fallback">
              Having trouble loading the form?{" "}
              <a href="https://pauseai.info/uk-email-mp" target="_blank" rel="noreferrer">Open it on pauseai.info &rarr;</a>
            </p>
          </div>
        </section>

        <section className="campaigns-share">
          <div className="container">
            <button type="button" className="qr-thumb" aria-label="Show QR code larger">
              <img src="/campaign-page-qr-code.png" alt="QR code linking to this campaign page" width={180} height={180} loading="lazy" />
              <span>Scan to share this page</span>
            </button>
          </div>
        </section>
      </main>

      <div className="qr-lightbox" id="qr-lightbox" aria-hidden="true" role="dialog" aria-label="QR code">
        <button className="qr-lightbox-close" type="button" aria-label="Close">&times;</button>
        <img src="/campaign-page-qr-code.png" alt="QR code linking to this campaign page" />
      </div>

      <CampaignsClient />
    </>
  );
}
