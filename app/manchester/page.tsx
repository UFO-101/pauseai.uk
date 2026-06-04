import type { Metadata } from "next";
import Nav from "@/components/Nav";
import { site } from "@/lib/data/site";

export const metadata: Metadata = {
  title: "PauseAI UK — Manchester Chapter",
  openGraph: {
    title: "PauseAI Manchester",
    description: "Join the Manchester chapter of PauseAI for meetups, outreach, and AI safety action.",
    images: [{ url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 }],
    url: "https://pauseai.uk/manchester",
  },
  twitter: {
    title: "PauseAI Manchester",
    description: "Join the Manchester chapter of PauseAI for meetups, outreach, and AI safety action.",
    images: ["/images/open-graph/open-graph-1080-1080.jpg"],
  },
  alternates: { canonical: "/manchester" },
};

const MANCHESTER_WHATSAPP = "https://chat.whatsapp.com/Ja1X3ms77NgHc5jSrZIGVR?mode=gi_t";

export default function ManchesterPage() {
  return (
    <>
      <Nav chapterName="Manchester" chapterLogoSrc="/images/chapters/manchester/manchester_logo.png" />
      <main>
        <section className="hero" style={{ paddingBottom: 48 }}>
          <div className="container hero-grid">
            <div className="hero-copy">
              <h1>PauseAI Manchester</h1>
              <p className="lede">
                Building a local network in the North West to campaign for AI safety, host discussions, and support national actions.
              </p>
              <div className="actions">
                <a className="btn primary" href={MANCHESTER_WHATSAPP} target="_blank" rel="noreferrer">Join the WhatsApp community</a>
                <a className="btn ghost" href="https://www.instagram.com/pauseai.manchester" target="_blank" rel="noreferrer">Follow us on Instagram</a>
                <a className="btn ghost" href="https://www.facebook.com/profile.php?id=61577650457496" target="_blank" rel="noreferrer">Follow us on Facebook</a>
                <a className="btn ghost" href="https://calendly.com/adr-skapars/pauseai-manchester-1-on-1" target="_blank" rel="noreferrer">Book a 1-on-1 chat</a>
              </div>
            </div>
            <div className="hero-visual">
              <div
                className="hero-photo"
                style={{
                  backgroundImage: "linear-gradient(135deg, rgba(255, 148, 22, 0.35), rgba(0,0,0,0.65)), url('/images/chapters/manchester/manchester_public.jpg')",
                  backgroundSize: "cover, 110% auto",
                  backgroundPosition: "center, center 22%",
                  backgroundRepeat: "no-repeat",
                }}
              ></div>
              <div className="hero-badge">Make your voice heard</div>
            </div>
          </div>
        </section>

        <section className="section container">
          <div className="section-header">
            <h2>What we&apos;re doing in Manchester</h2>
            <p className="section-lede">
              Public outreach, community discussion, and direct pressure on decision-makers.
            </p>
          </div>
          <div className="feature-grid">
            <article className="feature-card">
              <div className="dot"></div>
              <h3>Letters to MPs</h3>
              <p>Group emailing and letter-writing to put AI safety on our representatives&apos; desks.</p>
            </article>
            <article className="feature-card">
              <div className="dot"></div>
              <h3>Public outreach</h3>
              <p>Flyering and putting up posters in town to engage with the public on AI risk.</p>
            </article>
            <article className="feature-card">
              <div className="dot"></div>
              <h3>Discussion groups &amp; socials</h3>
              <p>Bringing people together to talk through the case for a pause and the future we want.</p>
            </article>
          </div>
        </section>

        <section className="section container">
          <div className="section-header">
            <h2>Events we&apos;ve done</h2>
          </div>
          <div className="activity-grid">
            <article className="activity-card">
              <div className="image-frame" style={{ backgroundImage: "url('/images/chapters/manchester/movie_night.jpg')" }}></div>
              <div className="card-copy">
                <h3>PauseAI Manchester Film Night</h3>
                <p>A screening of an AI x-risk video with popcorn and vegan snacks, followed by group conversation about how we respond to advanced AI.</p>
                <a className="inline-link" href="https://luma.com/p8saolij" target="_blank" rel="noreferrer">View event page</a>
              </div>
            </article>
            <article className="activity-card">
              <div className="image-frame" style={{ backgroundImage: "url('/images/chapters/manchester/discussion_group.jpg')", backgroundPosition: "center 42%" }}></div>
              <div className="card-copy">
                <h3>PauseAI x EA: Discussion Group</h3>
                <p>A friendly intro discussion on political solutions to existential risk from AI — covering whether pausing development and political action are effective strategies for reducing AI risk.</p>
                <a className="inline-link" href="https://luma.com/5dv44ate" target="_blank" rel="noreferrer">View event page</a>
              </div>
            </article>
            <article className="activity-card">
              <div className="image-frame" style={{ backgroundImage: "url('/images/chapters/manchester/coworking_event.jpg')" }}></div>
              <div className="card-copy">
                <h3>PauseAI Manchester Coworking</h3>
                <p>Casual coworking sessions where members come together to work on outreach, write to MPs, plan campaigns, and chat about AI safety over coffee.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="section muted">
          <div className="container">
            <div className="section-header">
              <h2>Link up with the chapter</h2>
              <p className="section-lede">
                Join the Manchester chat to connect with local organisers, or the UK chat for UK-wide events and campaigns. Want to learn more? Book a 1-on-1 chat.
              </p>
            </div>
            <div className="callout-inner" style={{ marginTop: 18 }}>
              <div>
                <p className="section-lede">Manchester chat: <a href={MANCHESTER_WHATSAPP} target="_blank" rel="noreferrer">PauseAI Manchester WhatsApp</a></p>
                <p className="section-lede">UK chat: <a href={site.whatsappUrl} target="_blank" rel="noreferrer">PauseAI UK WhatsApp</a></p>
              </div>
              <div className="actions">
                <a className="btn primary large" href="https://calendly.com/adr-skapars/pauseai-manchester-1-on-1" target="_blank" rel="noreferrer">Book a 1-on-1 chat</a>
                <a className="btn ghost large" href="mailto:Adr.Skapars@gmail.com">Email us</a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
