import type { Metadata } from "next";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "PauseAI UK — Leicester Chapter",
  openGraph: {
    title: "PauseAI Leicester",
    description: "Join the Leicester chapter of PauseAI for meetups, outreach, and AI safety action.",
    images: [{ url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 }],
    url: "https://pauseai.uk/leicester",
  },
  twitter: {
    title: "PauseAI Leicester",
    description: "Join the Leicester chapter of PauseAI for meetups, outreach, and AI safety action.",
    images: ["/images/open-graph/open-graph-1080-1080.jpg"],
  },
  alternates: { canonical: "/leicester" },
};

export default function LeicesterPage() {
  return (
    <>
      <Nav
        chapterName="Leicester"
        chapterLogoSrc="/images/chapters/leicester/leicester_logoBanner_tp_tp_darkmode.svg"
      />
      <main>
        <section className="hero" style={{ paddingBottom: 48 }}>
          <div className="container hero-grid">
            <div className="hero-copy">
              <h1>PauseAI Leicester</h1>
              <p className="lede">
                Building a local network to campaign for AI safety, host discussions, and support national actions.
              </p>
              <div className="actions">
                <a className="btn primary" href="mailto:leicester@pauseai.info">Email leicester@pauseai.info</a>
                <a className="btn ghost" href="https://www.instagram.com/pauseai_leicester/">Follow us on Instagram</a>
                <a className="btn ghost" href="https://discord.com">Join our Discord</a>
                <a className="btn ghost" href="/#get-involved">Join the WhatsApp community</a>
              </div>
            </div>
            <div className="hero-visual">
              <div
                className="hero-photo"
                style={{ backgroundImage: "linear-gradient(135deg, rgba(255, 148, 22, 0.35), rgba(0,0,0,0.65)), url('/images/chapters/leicester/london-2025-protest.jpg')" }}
              ></div>
              <div className="hero-badge">Join in on protests!</div>
            </div>
          </div>
        </section>

        <section className="section container">
          <div className="section-header">
            <h2>Growing the Leicester chapter</h2>
            <p className="section-lede">
              Want to help? We&apos;re looking for organisers, hosts, and partners to kickstart regular meetups.
            </p>
          </div>
          <div className="feature-grid">
            <article className="feature-card">
              <div className="dot"></div>
              <h3>Attend events</h3>
              <p>Check out our Instagram or Discord for more info on events.</p>
            </article>
            <article className="feature-card">
              <div className="dot"></div>
              <h3>Join the talk</h3>
              <p>Contact us on Instagram or Discord to find out how you can help.</p>
            </article>
          </div>
        </section>

        <section className="section muted">
          <div className="container">
            <div className="section-header">
              <h2>Past events</h2>
            </div>
            <div className="activity-grid" style={{ gridTemplateColumns: "1fr" }}>
              <article className="activity-card" style={{ maxWidth: 480 }}>
                <div className="image-frame" style={{ backgroundImage: "url('/images/chapters/leicester/SirBobBurgessBuilding.jpg')" }}></div>
                <div className="card-copy">
                  <h3>PauseAI Leicester Launch</h3>
                  <p>The launch event for the Leicester chapter, bringing together students and locals to discuss AI safety.</p>
                  <a className="btn primary" href="https://luma.com/plmfr5nz" target="_blank" rel="noreferrer">RSVP on Luma</a>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-header">
              <h2>Help shape the chapter</h2>
              <p className="section-lede">
                Contact us through the above methods if you can host an event, promote a meetup, or want to collaborate on outreach.
              </p>
            </div>
            <div className="callout-inner">
              <a className="btn primary large" href="mailto:leicester@pauseai.info">Email Leicester</a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
