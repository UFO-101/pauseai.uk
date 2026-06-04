import type { Metadata } from "next";
import Nav from "@/components/Nav";
import { site } from "@/lib/data/site";

export const metadata: Metadata = {
  title: "PauseAI UK — London Chapter",
  openGraph: {
    title: "PauseAI London",
    description: "Join PauseAI London for meetups, protests, and AI safety advocacy.",
    images: [{ url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 }],
    url: "https://pauseai.uk/london",
  },
  twitter: {
    title: "PauseAI London",
    description: "Join PauseAI London for meetups, protests, and AI safety advocacy.",
    images: ["/images/open-graph/open-graph-1080-1080.jpg"],
  },
  alternates: { canonical: "/london" },
};

export default function LondonPage() {
  return (
    <>
      <Nav chapterName="London" />
      <main>
        <section className="hero" style={{ paddingBottom: 48 }}>
          <div className="container hero-grid">
            <div className="hero-copy">
              <h1>PauseAI London</h1>
              <p className="lede">
                We gather researchers, students, campaigners, and neighbours to push for safer AI development through public action and dialogue.
              </p>
              <div className="actions">
                <a className="btn primary" href={site.whatsappUrl} target="_blank" rel="noreferrer">Join the WhatsApp community</a>
                <a className="btn ghost" href={`mailto:${site.contactEmail}`}>Email the team</a>
              </div>
            </div>
            <div className="hero-visual">
              <div
                className="hero-photo"
                style={{ backgroundImage: "linear-gradient(135deg, rgba(255, 148, 22, 0.35), rgba(0,0,0,0.65)), url('/images/book-launch-2025/G1kOF_EXMAA7yfX.jpeg')" }}
              ></div>
              <div className="hero-badge">Central meetups &amp; actions</div>
            </div>
          </div>
        </section>

        <section className="section container">
          <div className="section-header">
            <h2>What we&apos;re doing in London</h2>
            <p className="section-lede">
              We combine public education with visible action to keep AI safety on the agenda.
            </p>
          </div>
          <div className="activity-grid">
            <article className="activity-card">
              <div className="image-frame" style={{ backgroundImage: "url('/images/book-launch-2025/G1kOpmRWQAA8g2n.jpeg')" }}></div>
              <div className="card-copy">
                <h3>Book launch &amp; discussion</h3>
                <p>Standing-room-only event connecting authors, researchers, and the public around AI risk.</p>
              </div>
            </article>
            <article className="activity-card">
              <div className="image-frame" style={{ backgroundImage: "url('/images/letter-writing/G2DG8xBXMAABxmR.jpeg')" }}></div>
              <div className="card-copy">
                <h3>Letter-writing nights</h3>
                <p>Coordinated outreach to policymakers and institutions demanding enforceable AI safety commitments.</p>
              </div>
            </article>
            <article className="activity-card">
              <div className="image-frame" style={{ backgroundImage: "url('/images/chapters/london/london-feb-2025-protest.jpg')" }}></div>
              <div className="card-copy">
                <h3>Direct action</h3>
                <p>Peaceful protests at AI hubs to keep public pressure on labs and regulators.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="section muted">
          <div className="container">
            <div className="section-header">
              <h2>Join or host the next meetup</h2>
              <p className="section-lede">
                We meet regularly in central London for talks, workshops, and campaign planning.
              </p>
            </div>
            <div className="callout-inner">
              <div>
                <p className="section-lede" style={{ maxWidth: 640 }}>
                  New to the movement? Start by joining the WhatsApp community, then drop us an email if you&apos;d like to host or speak at an event.
                </p>
                <p><strong>Contact:</strong> <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a></p>
              </div>
              <a className="btn primary large" href={site.whatsappUrl} target="_blank" rel="noreferrer">Join the WhatsApp community</a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
