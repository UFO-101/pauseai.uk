import type { Metadata } from "next";
import Nav from "@/components/Nav";
import { site } from "@/lib/data/site";

export const metadata: Metadata = {
  title: "PauseAI UK — Glasgow Chapter",
  openGraph: {
    title: "PauseAI Glasgow",
    description: "PauseAI Glasgow hosts events and conversations on AI risk in Scotland.",
    images: [{ url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 }],
    url: "https://pauseai.uk/glasgow",
  },
  twitter: {
    title: "PauseAI Glasgow",
    description: "PauseAI Glasgow hosts events and conversations on AI risk in Scotland.",
    images: ["/images/open-graph/open-graph-1080-1080.jpg"],
  },
  alternates: { canonical: "/glasgow" },
};

const SCOTLAND_WHATSAPP = "https://chat.whatsapp.com/E7JeZgcD9qFAyErBasRzmU";

export default function GlasgowPage() {
  return (
    <>
      <Nav chapterName="Glasgow" />
      <main>
        <section className="hero" style={{ paddingBottom: 48 }}>
          <div className="container hero-grid">
            <div className="hero-copy">
              <h1>PauseAI Glasgow</h1>
              <p className="lede">
                Bringing AI safety conversations to Scotland with public events, panels, and community organising.
              </p>
              <div className="actions">
                <a className="btn primary" href={site.social.luma} target="_blank" rel="noreferrer">View event calendar</a>
                <a className="btn ghost" href={SCOTLAND_WHATSAPP} target="_blank" rel="noreferrer">Join Scotland chat</a>
              </div>
            </div>
            <div className="hero-visual">
              <div
                className="hero-photo"
                style={{ backgroundImage: "linear-gradient(135deg, rgba(255, 148, 22, 0.35), rgba(0,0,0,0.65)), url('/images/chapters/glasgow/GlasgowUniUnion.jpg')" }}
              ></div>
            </div>
          </div>
        </section>

        <section className="section container">
          <div className="section-header">
            <h2>What we&apos;ve done</h2>
          </div>
          <div className="activity-grid" style={{ gridTemplateColumns: "1fr" }}>
            <article className="activity-card" style={{ maxWidth: 480 }}>
              <div className="image-frame" style={{ backgroundImage: "url('/images/chapters/glasgow/GlasgowUniUnion.jpg')" }}></div>
              <div className="card-copy">
                <h3>AI Risk – A Conversation We All Need to Have</h3>
                <p>A public discussion unpacking the risks and responsibilities around advanced AI systems, featuring local voices and hands-on conversation.</p>
                <a className="inline-link" href="https://luma.com/5bmd6rx8" target="_blank" rel="noreferrer">View event page</a>
              </div>
            </article>
          </div>
        </section>

        <section className="section muted">
          <div className="container">
            <div className="section-header">
              <h2>Link up with the chapter</h2>
              <p className="section-lede">
                Join the Scotland chat to connect with local organisers, or the UK chat for UK-wide events and campaigns.
              </p>
            </div>
            <div className="callout-inner" style={{ marginTop: 18 }}>
              <div>
                <p className="section-lede">Scotland chat: <a href={SCOTLAND_WHATSAPP} target="_blank" rel="noreferrer">PauseAI Scotland WhatsApp</a></p>
                <p className="section-lede">UK chat: <a href={site.whatsappUrl} target="_blank" rel="noreferrer">PauseAI UK WhatsApp</a></p>
              </div>
              <a className="btn primary large" href={SCOTLAND_WHATSAPP} target="_blank" rel="noreferrer">Join Scotland chat</a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
