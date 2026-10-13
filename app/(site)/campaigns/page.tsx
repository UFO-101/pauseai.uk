import type { Metadata } from "next";
import Image from "next/image";
import CampaignsClient from "./CampaignsClient";
import SignatoriesList from "./SignatoriesList";
import { site } from "@/lib/data/site";
import "./campaigns.css";

// Fallback for local/preview environments without AIRTABLE_TOKEN set — the
// original public share link, scoped to the same signatory columns.
const SIGNATORIES_EMBED = "https://airtable.com/embed/appBInVvIm6opJ1Ob/shrQ4CTHTx5VrLPnp";

export const metadata: Metadata = {
  title: "Campaigns",
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
  alternates: { canonical: "/campaigns" },
};

export default function CampaignsPage() {
  return (
    <>
      <main className="campaigns">
        <section className="campaigns-hero">
          <div className="container">
            <h1>Regulate AI developers now</h1>
            <p className="hero-cta-row">
              <a className="btn primary" href="#email-your-mp">Email your MP &rarr;</a>
            </p>
          </div>
        </section>

        <section className="campaigns-context">
          <div className="container">
            <p>AI poses extremely serious risks to our national security.</p>
            <p>In a series of incidents this summer, a &ldquo;swarm&rdquo; of OpenAI agents created secret messaging channels and hacked into the infrastructure of another AI company, and OpenAI itself, without OpenAI being aware. These attacks would have constituted criminal offences if they had been performed by humans. Yet no one has been held accountable to date.</p>
            <p>Today, the UK has no specific legal standards for frontier AI safety. No regulator oversees frontier AI development, and UK law does not reliably hold developers liable for damage or deaths caused by their models, even when the danger is predictable, preventable, and uniquely enabled by AI.</p>
            <p>Given the pace at which AI capabilities are advancing, this matter cannot wait. We urge the Prime Minister to introduce legislation to address the risks of frontier AI development.</p>
          </div>
        </section>

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

        <section id="signatories" className="campaigns-signatories">
          <div className="container">
            <h2>Parliamentary signatories</h2>
            {process.env.AIRTABLE_TOKEN ? (
              <SignatoriesList />
            ) : (
              <div className="embed-frame signatories-frame">
                <iframe
                  src={SIGNATORIES_EMBED}
                  title="Parliamentary signatories to the Frontier AI open letter"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            )}
            <p className="signatories-press-note">
              <strong>Note for journalists:</strong> we&rsquo;re planning a public announcement about this letter at a later date. We&rsquo;d be grateful if you held off reporting on the signatories until then. For early access or interviews, contact{" "}
              <a href={`mailto:${site.pressEmail}`}>{site.pressEmail}</a>.
            </p>
          </div>
        </section>

        <section className="campaigns-share">
          <div className="container">
            <button type="button" className="qr-thumb" aria-label="Show QR code larger">
              <Image src="/campaign-page-qr-code.png" alt="QR code linking to this campaign page" width={180} height={180} loading="lazy" />
              <span>Scan to share this page</span>
            </button>
          </div>
        </section>
      </main>

      <div className="qr-lightbox" id="qr-lightbox" aria-hidden="true" role="dialog" aria-label="QR code">
        <button className="qr-lightbox-close" type="button" aria-label="Close">&times;</button>
        <Image src="/campaign-page-qr-code.png" alt="QR code linking to this campaign page" width={1147} height={1147} />
      </div>

      <CampaignsClient />
    </>
  );
}
