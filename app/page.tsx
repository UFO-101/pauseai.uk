import type { Metadata } from "next";
import type { CSSProperties } from "react";

function parseCssStyle(css: string): CSSProperties {
  const result: Record<string, string> = {};
  css.split(";").filter(Boolean).forEach((decl) => {
    const colonIdx = decl.indexOf(":");
    if (colonIdx === -1) return;
    const key = decl.slice(0, colonIdx).trim().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    result[key] = decl.slice(colonIdx + 1).trim();
  });
  return result as CSSProperties;
}
import Nav from "@/components/Nav";
import EventList from "@/components/EventList";
import { getEvents } from "@/lib/data/events";
import { newsRow1, newsRow2 } from "@/lib/data/news";
import { stories } from "@/lib/data/stories";
import { people } from "@/lib/data/people";
import { site } from "@/lib/data/site";

export const metadata: Metadata = {
  title: "PauseAI UK",
  description: "Community-led action for safe and accountable AI.",
  openGraph: {
    title: "PauseAI UK",
    description: "Community-led action for safe and accountable AI across the UK.",
    images: [{ url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 }],
    url: "https://pauseai.uk/",
  },
  twitter: {
    images: ["/images/open-graph/open-graph-1600-840.jpg"],
  },
};

export default async function HomePage() {
  const events = await getEvents();

  return (
    <>
      <Nav />
      <main>
        <section id="about" className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <h1>PauseAI UK</h1>
              <p className="lede">
                We mobilise communities, challenge industry, and press leaders to pause unsafe AI development until real safeguards exist.
              </p>
              <div className="actions hero-actions">
                <a className="btn primary" href={site.whatsappUrl} target="_blank" rel="noreferrer">
                  Join the WhatsApp community
                </a>
                <div className="hero-actions-secondary">
                  <a className="btn ghost" href="/track-record/">Track record →</a>
                  <a className="btn ghost" href="/theory-of-change/">Theory of change →</a>
                </div>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-photo">
                <img
                  src="images/front-page/london-2025-protest.jpg"
                  alt="PauseAI UK protest in London"
                  width={800}
                  height={450}
                  fetchPriority="high"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="next-event">
          <div className="container">
            <EventList events={events} lumaUrl={site.social.luma} />
          </div>
        </section>

        <section id="chapters" className="section muted">
          <div className="container">
            <div className="section-header">
              <h2>Organising across the UK</h2>
              <p className="section-lede">
                Find your city and get involved. Each chapter runs its own events, campaigns, and outreach.
              </p>
            </div>
            <div className="chapter-grid">
              <a className="chapter-card" href="/london">
                <div className="image-frame" style={{ backgroundImage: `url("images/letter-writing/G2DG8xBXMAABxmR.jpeg")` }}></div>
                <div className="card-copy">
                  <div className="card-header">
                    <h3>London</h3>
                    <span className="card-link">Explore London →</span>
                  </div>
                  <p>Book launches, letter-writing nights, and regular meetups in central London.</p>
                </div>
              </a>
              <a className="chapter-card" href="/leicester">
                <div className="image-frame" style={{ backgroundImage: `url("images/front-page/london-2025-protest.jpg")` }}></div>
                <div className="card-copy">
                  <div className="card-header">
                    <h3>Leicester</h3>
                    <span className="card-link">Explore Leicester →</span>
                  </div>
                  <p>Growing community taking action locally and online.</p>
                </div>
              </a>
              <a className="chapter-card" href="/oxford">
                <div className="image-frame" style={{ backgroundImage: `url("images/chapters/oxford/PauseAI Oxford.jpg")` }}></div>
                <div className="card-copy">
                  <div className="card-header">
                    <h3>Oxford</h3>
                    <span className="card-link">Explore Oxford →</span>
                  </div>
                  <p>University-driven dialogue on AI risk with researchers and students.</p>
                </div>
              </a>
              <a className="chapter-card" href="/glasgow">
                <div className="image-frame" style={{ backgroundImage: `url("images/documentary-screening/G4W9UyLXwAA9ISl.jpeg")` }}></div>
                <div className="card-copy">
                  <div className="card-header">
                    <h3>Glasgow</h3>
                    <span className="card-link">Explore Glasgow →</span>
                  </div>
                  <p>Building momentum with public events and community outreach.</p>
                </div>
              </a>
              <a className="chapter-card" href="/manchester">
                <div className="image-frame" style={{ backgroundImage: `url("images/chapters/manchester/manchester_public.jpg")`, backgroundSize: "110% auto", backgroundPosition: "center 22%" }}></div>
                <div className="card-copy">
                  <div className="card-header">
                    <h3>Manchester</h3>
                    <span className="card-link">Explore Manchester →</span>
                  </div>
                  <p>New chapter bringing AI safety conversations and action to the North West.</p>
                </div>
              </a>
              <a
                className="chapter-card"
                href="https://docs.google.com/document/d/1wVqsjGatoP3ltspkeqnyeye7I1d_V8XYRPQGaGyvitQ/edit?usp=sharing"
                target="_blank"
                rel="noreferrer"
              >
                <div className="image-frame" style={{ backgroundImage: `url("images/front-page/DSCF9617.jpg")` }}></div>
                <div className="card-copy">
                  <div className="card-header">
                    <h3>Start a chapter</h3>
                    <span className="card-link">Get started →</span>
                  </div>
                  <p>Bring PauseAI to your city. We&apos;ll share playbooks, visuals, and support to launch local actions.</p>
                </div>
              </a>
            </div>
          </div>
        </section>

        <section id="news" className="section container">
          <div className="section-header">
            <h2>In the news</h2>
          </div>
          <div className="news-marquee" aria-label="Press coverage of PauseAI UK">
            <div className="news-marquee-row">
              <div className="news-marquee-track">
                {[...newsRow1, ...newsRow1].map((item, i) => (
                  <a
                    key={i}
                    className="news-marquee-item"
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    title={item.title}
                    aria-label={`${item.logoAlt}: ${item.title}`}
                    {...(i >= newsRow1.length ? { "aria-hidden": true, tabIndex: -1 } : {})}
                  >
                    <div className="news-logo-box">
                      {item.logoSrc ? (
                        <img className="news-logo" src={item.logoSrc} alt={item.logoAlt} loading="lazy" />
                      ) : (
                        <span dangerouslySetInnerHTML={{ __html: item.logoHtml! }} />
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
            <div className="news-marquee-row news-marquee-row--reverse">
              <div className="news-marquee-track">
                {[...newsRow2, ...newsRow2].map((item, i) => (
                  <a
                    key={i}
                    className="news-marquee-item"
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    title={item.title}
                    aria-label={`${item.logoAlt}: ${item.title}`}
                    {...(i >= newsRow2.length ? { "aria-hidden": true, tabIndex: -1 } : {})}
                  >
                    <div className="news-logo-box">
                      {item.logoSrc ? (
                        <img className="news-logo" src={item.logoSrc} alt={item.logoAlt} loading="lazy" />
                      ) : (
                        <span dangerouslySetInnerHTML={{ __html: item.logoHtml! }} />
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="stories" className="section stories">
          <div className="container">
            <div className="section-header">
              <h2>Personal stories</h2>
              <p className="section-lede">Each of us found PauseAI for our own reasons. Here are a few.</p>
            </div>
            <div className="story-grid">
              {stories.map((story) => (
                <article key={story.name} className="story-card">
                  <header className="story-card-header">
                    <div
                      className="story-avatar"
                      style={{ backgroundImage: `url("${story.imageSrc}")`, ...parseCssStyle(story.imageStyle) }}
                    ></div>
                    <h3 className="story-name">{story.name}</h3>
                  </header>
                  <div className="story-body">
                    {story.paragraphs.map((para, j) => (
                      <p key={j} dangerouslySetInnerHTML={{ __html: para }} />
                    ))}
                  </div>
                </article>
              ))}
              <p className="section-lede">
                <i>Tag us on social media with your extinction risk realisation if you want to be spotlighted!</i>
              </p>
            </div>
          </div>
        </section>

        <section className="section shop-banner">
          <div className="container callout-inner">
            <div>
              <h2>Get PauseAI merch</h2>
              <p className="section-lede">
                T-shirts, hoodies, stickers and more – every purchase helps spread the word and supports our mission.
              </p>
              <a className="btn primary large" href={site.shopUrl} target="_blank" rel="noreferrer">Browse the shop →</a>
            </div>
            <a className="shop-image-link" href={site.shopUrl} target="_blank" rel="noreferrer">
              <img src="images/fourthwall.avif" alt="PauseAI merchandise" className="shop-image" width={1536} height={2048} loading="lazy" />
            </a>
          </div>
        </section>

        <section id="join" className="section container">
          <div className="section-header">
            <h2>Join PauseAI UK</h2>
            <p className="section-lede">Fill out the form below to get involved.</p>
          </div>
          <div className="tally-embed">
            <iframe
              data-tally-src="https://tally.so/embed/wbGvKe?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1"
              loading="lazy"
              width="100%"
              height={1749}
              frameBorder={0}
              marginHeight={0}
              marginWidth={0}
              title="Get involved!"
            ></iframe>
          </div>
        </section>

        <section id="get-involved" className="section callout">
          <div className="container callout-inner">
            <div>
              <h2>Join the conversation</h2>
              <p className="section-lede">
                Our WhatsApp community is where we coordinate protests, share news, and plan what&apos;s next. It&apos;s the fastest way to stay in the loop.
              </p>
              <p className="section-lede">
                You can also browse upcoming meetups and actions on our{" "}
                <a className="inline-link" href={site.social.luma} target="_blank" rel="noreferrer">event calendar</a>.
              </p>
            </div>
            <a className="btn primary large" href={site.whatsappUrl} target="_blank" rel="noreferrer">
              Join the WhatsApp community
            </a>
          </div>
        </section>

        <section id="people" className="section container">
          <div className="section-header">
            <h2>Meet the organisers</h2>
            <p className="section-lede">
              PauseAI UK is volunteer-driven, supported by two paid staff. Get in touch to collaborate or{" "}
              <a
                className="inline-link"
                href="https://docs.google.com/document/d/1wVqsjGatoP3ltspkeqnyeye7I1d_V8XYRPQGaGyvitQ/edit?usp=sharing"
                target="_blank"
                rel="noreferrer"
              >
                start a new chapter
              </a>.
            </p>
          </div>
          <div className="people-grid">
            {people.map((person) => (
              <article key={person.name} className="person-card">
                <div className="avatar" style={{ backgroundImage: `url("${person.imageSrc}")` }}></div>
                <div>
                  <h3>{person.name}</h3>
                  <p className="role">{person.role}</p>
                  <p className="bio">{person.bio}</p>
                </div>
              </article>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 36 }}>
            <a className="btn primary large" href="/theory-of-change/">Read our theory of change →</a>
          </div>
        </section>
      </main>
      <script
        dangerouslySetInnerHTML={{
          __html: `var d=document,w="https://tally.so/widgets/embed.js",v=function(){"undefined"!=typeof Tally?Tally.loadEmbeds():d.querySelectorAll("iframe[data-tally-src]:not([src])").forEach(function(e){e.src=e.dataset.tallySrc})};if("undefined"!=typeof Tally)v();else if(d.querySelector('script[src="'+w+'"]')==null){var s=d.createElement("script");s.src=w;s.onload=v;s.onerror=v;d.body.appendChild(s)}`,
        }}
      />
    </>
  );
}
