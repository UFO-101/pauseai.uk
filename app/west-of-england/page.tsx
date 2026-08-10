import type { Metadata } from "next";
import Nav from "@/components/Nav";
import { site } from "@/lib/data/site";

export const metadata: Metadata = {
  title: "PauseAI UK — West of England Chapter",
  openGraph: {
    title: "PauseAI West of England",
    description: "Join the West of England chapter of PauseAI for meetups, outreach, and AI safety action around Bristol and the wider region.",
    images: [{ url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 }],
    url: "https://pauseai.uk/west-of-england",
  },
  twitter: {
    title: "PauseAI West of England",
    description: "Join the West of England chapter of PauseAI for meetups, outreach, and AI safety action around Bristol and the wider region.",
    images: ["/images/open-graph/open-graph-1080-1080.jpg"],
  },
  alternates: { canonical: "/west-of-england" },
};

const WEST_OF_ENGLAND_WHATSAPP = "https://chat.whatsapp.com/CUjVyzLxjcM88mdQOlU0IN";
const WEST_OF_ENGLAND_LINKTREE = "https://linktr.ee/PauseAI_West_of_England";

export default function WestOfEnglandPage() {
  return (
    <>
      <Nav
        chapterName="West of England"
        chapterLogoSrc="/images/chapters/west-of-england/west-of-england-rondel.png"
        chapterLogoWidth={240}
        chapterLogoHeight={240}
      />
      <main>
        <section className="hero" style={{ paddingBottom: 48 }}>
          <div className="container hero-grid">
            <div className="hero-copy">
              <h1>PauseAI West of England</h1>
              <p className="lede">
                A new chapter bringing AI safety conversations and action to Bristol and the wider West of England.
              </p>
              <div className="actions">
                <a className="btn primary" href={WEST_OF_ENGLAND_WHATSAPP} target="_blank" rel="noreferrer">Join the WhatsApp group</a>
                <a className="btn ghost" href={WEST_OF_ENGLAND_LINKTREE} target="_blank" rel="noreferrer">All our links</a>
              </div>
            </div>
            <div className="hero-visual">
              <div
                className="hero-photo"
                style={{
                  backgroundImage: "linear-gradient(135deg, rgba(255, 148, 22, 0.35), rgba(0,0,0,0.65)), url('/images/chapters/west-of-england/bristol-launch.jpg')",
                  backgroundSize: "cover, cover",
                  backgroundPosition: "center, center",
                  backgroundRepeat: "no-repeat",
                }}
              ></div>
              <div className="hero-badge">Just getting started</div>
            </div>
          </div>
        </section>

        <section className="section container">
          <div className="section-header">
            <h2>What we&apos;re building in the West of England</h2>
            <p className="section-lede">
              A brand new chapter — get in early and help shape how we campaign locally.
            </p>
          </div>
          <div className="feature-grid">
            <article className="feature-card">
              <div className="dot"></div>
              <h3>Discussion groups &amp; socials</h3>
              <p>Bringing people together to talk through the case for a pause and the future we want.</p>
            </article>
            <article className="feature-card">
              <div className="dot"></div>
              <h3>Public outreach</h3>
              <p>Flyering, stalls, and posters to engage the public on AI risk.</p>
            </article>
            <article className="feature-card">
              <div className="dot"></div>
              <h3>Letters to MPs</h3>
              <p>Group emailing and letter-writing to put AI safety on our representatives&apos; desks.</p>
            </article>
          </div>
        </section>

        <section className="section muted">
          <div className="container">
            <div className="section-header">
              <h2>Link up with the chapter</h2>
              <p className="section-lede">
                Join the local WhatsApp to connect with organisers, or the UK-wide chat for national events and campaigns.
              </p>
            </div>
            <div className="callout-inner">
              <div>
                <p className="section-lede">Local chat: <a href={WEST_OF_ENGLAND_WHATSAPP} target="_blank" rel="noreferrer">PauseAI West of England WhatsApp</a></p>
                <p className="section-lede">UK chat: <a href={site.whatsappUrl} target="_blank" rel="noreferrer">PauseAI UK WhatsApp</a></p>
                <p className="section-lede">All our links: <a href={WEST_OF_ENGLAND_LINKTREE} target="_blank" rel="noreferrer">linktr.ee/PauseAI_West_of_England</a></p>
              </div>
              <a className="btn primary large" href={WEST_OF_ENGLAND_WHATSAPP} target="_blank" rel="noreferrer">Join the WhatsApp group</a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
