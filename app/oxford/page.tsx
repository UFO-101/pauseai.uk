import type { Metadata } from "next";
import Nav from "@/components/Nav";
import { site } from "@/lib/data/site";

export const metadata: Metadata = {
  title: "PauseAI UK — Oxford Chapter",
  openGraph: {
    title: "PauseAI Oxford",
    description: "PauseAI Oxford links students, researchers, and locals to discuss and act on AI safety.",
    images: [{ url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 }],
    url: "https://pauseai.uk/oxford",
  },
  twitter: {
    title: "PauseAI Oxford",
    description: "PauseAI Oxford links students, researchers, and locals to discuss and act on AI safety.",
    images: ["/images/open-graph/open-graph-1080-1080.jpg"],
  },
  alternates: { canonical: "/oxford" },
};

export default function OxfordPage() {
  return (
    <>
      <Nav chapterName="Oxford" />
      <main>
        <section className="hero" style={{ paddingBottom: 48 }}>
          <div className="container hero-grid">
            <div className="hero-copy">
              <h1>PauseAI Oxford</h1>
              <p className="lede">
                University-driven conversations on AI risk, grounded in collaboration between students, researchers, and local residents.
              </p>
              <div className="actions">
                <a className="btn primary" href="mailto:oxford@pauseai.info">Email oxford@pauseai.info</a>
                <a className="btn ghost" href="/#get-involved">Join national chat</a>
              </div>
            </div>
            <div className="hero-visual">
              <div
                className="hero-photo"
                style={{ backgroundImage: "linear-gradient(135deg, rgba(255, 148, 22, 0.35), rgba(0,0,0,0.65)), url('/images/chapters/oxford/PauseAI Oxford.jpg')" }}
              ></div>
              <div className="hero-badge">Academic &amp; community bridge</div>
            </div>
          </div>
        </section>

        <section className="section container">
          <div className="section-header">
            <h2>Oxford chapter focus</h2>
            <p className="section-lede">
              Oxford brings together safety researchers, policy thinkers, and students for talks, reading groups, and public engagement.
            </p>
          </div>
          <div className="feature-grid">
            <article className="feature-card">
              <div className="dot"></div>
              <h3>Reading groups</h3>
              <p>Digest recent AI safety policy proposals and critique lab commitments.</p>
            </article>
            <article className="feature-card">
              <div className="dot"></div>
              <h3>Workshops</h3>
              <p>Skill-shares on communicating risk and mobilising campus support.</p>
            </article>
            <article className="feature-card">
              <div className="dot"></div>
              <h3>Joint actions</h3>
              <p>Coordinate with other cities for aligned protests and open letters.</p>
            </article>
          </div>
        </section>

        <section className="section muted">
          <div className="container">
            <div className="section-header">
              <h2>What we&apos;ve done</h2>
            </div>
            <div className="activity-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              <article className="activity-card">
                <div className="image-frame" style={{ backgroundImage: "url('/images/chapters/oxford/ReubenCollege.jpg')" }}></div>
                <div className="card-copy">
                  <h3>PauseAI Oxford Launch: Why AI will cause human extinction</h3>
                  <p>The inaugural PauseAI Oxford event, exploring existential risk from advanced AI systems.</p>
                  <a className="inline-link" href="https://luma.com/5li0gx6b" target="_blank" rel="noreferrer">View event page</a>
                </div>
              </article>
              <article className="activity-card">
                <div className="image-frame" style={{ backgroundImage: "url('/images/chapters/oxford/ReubenBar.jpg')" }}></div>
                <div className="card-copy">
                  <h3>How to Pause AI Development – Talk + social</h3>
                  <p>A talk on practical strategies for slowing unsafe AI development, followed by drinks and discussion.</p>
                  <a className="inline-link" href="https://luma.com/lqnts0io" target="_blank" rel="noreferrer">View event page</a>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-header">
              <h2>Contact the Oxford team</h2>
              <p className="section-lede">
                Email us to join the mailing list, attend the next meet, or host an event on campus.
              </p>
            </div>
            <div className="callout-inner">
              <div>
                <p className="section-lede">Email: <a href="mailto:oxford@pauseai.info">oxford@pauseai.info</a></p>
                <p className="section-lede">National chat: <a href={site.whatsappUrl} target="_blank" rel="noreferrer">WhatsApp community</a></p>
              </div>
              <a className="btn primary large" href="mailto:oxford@pauseai.info">Email Oxford</a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
