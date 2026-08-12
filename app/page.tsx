import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import OnboardingFormEmbed from "./OnboardingFormEmbed";
import HeroMarqueeEffects from "./HeroMarqueeEffects";
import Nav from "@/components/Nav";
import EventList from "@/components/EventList";
import PeopleCarousel from "@/components/PeopleCarousel";
import { getEvents } from "@/lib/data/events";
import { newsRow1, newsRow2, newsMobileRow1, newsMobileRow2, newsMobileRow3, type NewsItem } from "@/lib/data/news";
import { people } from "@/lib/data/people";
import { staff } from "@/lib/data/staff";
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

function renderNewsRow(items: NewsItem[], reverse = false) {
  return (
    <div className={`news-marquee-row${reverse ? " news-marquee-row--reverse" : ""}`}>
      <div className="news-marquee-track">
        {[0, 1].map((copyIdx) => (
          <div
            key={copyIdx}
            className="news-marquee-copy"
            {...(copyIdx > 0 ? { "aria-hidden": true } : {})}
          >
            {items.map((item, i) => (
              <a
                key={i}
                className="news-marquee-item"
                href={item.url}
                target="_blank"
                rel="noreferrer"
                title={item.title}
                aria-label={`${item.logoAlt}: ${item.title}`}
                {...(copyIdx > 0 ? { tabIndex: -1 } : {})}
              >
                <div className="news-logo-box">
                  {item.logoSrc ? (
                    <Image
                      className="news-logo"
                      src={item.logoSrc}
                      alt={item.logoAlt}
                      width={item.logoIntrinsicWidth ?? 100}
                      height={item.logoIntrinsicHeight ?? 44}
                      loading="lazy"
                      style={item.logoHeight ? ({ "--logo-h": item.logoHeight } as CSSProperties) : undefined}
                    />
                  ) : (
                    <span dangerouslySetInnerHTML={{ __html: item.logoHtml! }} />
                  )}
                </div>
              </a>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// [src, alt, intrinsic width, intrinsic height] — the dimensions are
// required by next/image for aspect ratio; actual display size is driven
// by the CSS (height: 100%; width: auto) on .hero-marquee-track img.
const HERO_PHOTOS: [string, string, number, number][] = [
  ["alistair-june-2025-protest.webp", "Alistair at the June 2025 London protest", 800, 450],
  ["alistair-reading.webp", "Alistair Reith at a PauseAI event", 800, 416],
  ["benifei-russell-panel.webp", "Benifei and Russell at the PauseCon Brussels panel", 800, 449],
  ["book-launch-joseph.webp", "Joseph at the PauseAI UK book launch", 800, 600],
  ["connor-leahy.webp", "Connor Leahy speaking at a PauseCon", 800, 908],
  ["deepmind-close-up.webp", "Protester outside Google DeepMind", 800, 450],
  ["june-2025-protest-closeup.webp", "June 2025 protest close-up", 800, 450],
  ["laiba-brussels.webp", "Laiba at PauseCon Brussels", 800, 606],
  ["letter-writing.webp", "PauseAI UK letter-writing session", 800, 837],
  ["london-june-2025-protest-group.webp", "London June 2025 protest group", 800, 360],
  ["maxime-speech-audience.webp", "Maxime delivering a speech to a London audience", 800, 282],
  ["pausecon-brussels-2026-panel.webp", "PauseCon Brussels 2026 panel", 800, 450],
  ["pausecon-brussels-discussion.webp", "PauseCon Brussels discussion", 800, 534],
  ["pausecon-london-2025-people-talking.webp", "PauseCon London 2025 discussion", 800, 533],
  ["pausecon-london-ella-workshop.webp", "Ella's workshop at PauseCon London", 800, 533],
  ["scott-wiener-on-screen.webp", "Scott Wiener on screen at a PauseAI event", 800, 450],
  ["stuart-russell-interview.webp", "Stuart Russell interview at PauseCon Brussels", 800, 534],
  ["westminster-hall.webp", "Westminster Hall event", 800, 448],
];

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function HomePage() {
  const events = await getEvents();

  // Server-component shuffle: a new order each render. Sent to the
  // client as part of the rendered HTML so hydration matches.
  const shuffled = shuffle(HERO_PHOTOS);
  const heroRows = [
    { dir: "ltr" as const, photos: shuffled.slice(0, 6) },
    { dir: "rtl" as const, photos: shuffled.slice(6, 12) },
    { dir: "ltr" as const, photos: shuffled.slice(12, 18) },
  ];

  return (
    <>
      <Nav />
      <main>
        <section id="about" className="hero">
          <div className="hero-marquee">
            {heroRows.map((row, ri) => (
              <div key={ri} className={`hero-marquee-row hero-marquee-row--${row.dir}`}>
                <div className="hero-marquee-track">
                  {[0, 1].map((copyIdx) => (
                    <div
                      key={copyIdx}
                      className="hero-marquee-copy"
                      {...(copyIdx > 0 ? { "aria-hidden": true } : {})}
                    >
                      {[...row.photos, ...row.photos].map(([src, alt, width, height], i) => {
                        const isPrimary = copyIdx === 0 && i < row.photos.length;
                        const isLcp = ri === 0 && copyIdx === 0 && i === 0;
                        return (
                          <Image
                            key={i}
                            src={`/images/front-page-hero-optimized/${src}`}
                            alt={isPrimary ? alt : ""}
                            width={width}
                            height={height}
                            aria-hidden={!isPrimary || undefined}
                            loading={isLcp ? undefined : "lazy"}
                            priority={isLcp}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="hero-marquee-overlay">
              <div className="hero-marquee-text">
                <h1>Organising for<br/>our future</h1>
                <p className="hero-lede">
                  We are the civic movement dedicated to averting the risks of superhuman artificial intelligence.
                </p>
                <div className="actions hero-actions">
                  <a className="btn primary" href={site.whatsappUrl} target="_blank" rel="noreferrer">
                    Join the WhatsApp community
                  </a>
                  <div className="hero-actions-secondary">
                    <a className="btn ghost" href="#events">Upcoming events ↓</a>
                    <Link className="btn ghost" href="/track-record/">Track record →</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="events" className="next-event">
          <div className="container">
            <div className="section-heading-row">
              <h2 className="section-heading">Upcoming events</h2>
              <a
                className="btn primary section-heading-cta"
                href={site.social.luma}
                target="_blank"
                rel="noreferrer"
              >
                View full calendar →
              </a>
            </div>
            <EventList events={events} lumaUrl={site.social.luma} />
          </div>
        </section>

        <section id="news" className="section">
          <div className="news-marquee" aria-label="Press coverage of PauseAI UK">
            <div className="news-marquee-set news-marquee-set--desktop" aria-hidden={false}>
              {renderNewsRow(newsRow1)}
              {renderNewsRow(newsRow2, true)}
            </div>
            <div className="news-marquee-set news-marquee-set--mobile" aria-hidden={true}>
              {renderNewsRow(newsMobileRow1)}
              {renderNewsRow(newsMobileRow2, true)}
              {renderNewsRow(newsMobileRow3)}
            </div>
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
              <Link className="chapter-card" href="/london">
                <div className="image-frame" style={{ backgroundImage: `url("images/letter-writing/G2DG8xBXMAABxmR.jpeg")` }}></div>
                <div className="card-copy">
                  <div className="card-header">
                    <h3>London</h3>
                    <span className="card-link">Explore London →</span>
                  </div>
                  <p>Book launches, letter-writing nights, and regular meetups in central London.</p>
                </div>
              </Link>
              <Link className="chapter-card" href="/leicester">
                <div className="image-frame" style={{ backgroundImage: `url("/images/chapters/leicester/london-2025-protest.jpg")` }}></div>
                <div className="card-copy">
                  <div className="card-header">
                    <h3>Leicester</h3>
                    <span className="card-link">Explore Leicester →</span>
                  </div>
                  <p>Growing community taking action locally and online.</p>
                </div>
              </Link>
              <Link className="chapter-card" href="/oxford">
                <div className="image-frame" style={{ backgroundImage: `url("images/chapters/oxford/PauseAI Oxford.jpg")` }}></div>
                <div className="card-copy">
                  <div className="card-header">
                    <h3>Oxford</h3>
                    <span className="card-link">Explore Oxford →</span>
                  </div>
                  <p>University-driven dialogue on AI risk with researchers and students.</p>
                </div>
              </Link>
              <Link className="chapter-card" href="/glasgow">
                <div className="image-frame" style={{ backgroundImage: `url("images/documentary-screening/G4W9UyLXwAA9ISl.jpeg")` }}></div>
                <div className="card-copy">
                  <div className="card-header">
                    <h3>Glasgow</h3>
                    <span className="card-link">Explore Glasgow →</span>
                  </div>
                  <p>Building momentum with public events and community outreach.</p>
                </div>
              </Link>
              <Link className="chapter-card" href="/manchester">
                <div className="image-frame" style={{ backgroundImage: `url("images/chapters/manchester/manchester_public.jpg")`, backgroundSize: "110% auto", backgroundPosition: "center 22%" }}></div>
                <div className="card-copy">
                  <div className="card-header">
                    <h3>Manchester</h3>
                    <span className="card-link">Explore Manchester →</span>
                  </div>
                  <p>New chapter bringing AI safety conversations and action to the North West.</p>
                </div>
              </Link>
              <Link className="chapter-card" href="/west-of-england">
                <div className="image-frame" style={{ backgroundImage: `url("/images/chapters/west-of-england/bristol-launch.jpg")` }}></div>
                <div className="card-copy">
                  <div className="card-header">
                    <h3>West of England</h3>
                    <span className="card-link">Explore West of England →</span>
                  </div>
                  <p>New chapter bringing AI safety conversations and action to Bristol and beyond.</p>
                </div>
              </Link>
              <a
                className="chapter-card"
                href="https://docs.google.com/document/d/1wVqsjGatoP3ltspkeqnyeye7I1d_V8XYRPQGaGyvitQ/edit?usp=sharing"
                target="_blank"
                rel="noreferrer"
              >
                <div className="image-frame" style={{ backgroundImage: `url("/images/chapters/start-a-chapter/treasury-protest.jpg")` }}></div>
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

        <section id="people" className="section people">
          <div className="container">
            <div className="section-header">
              <h2>People of PauseAI</h2>
              <p className="section-lede">
                Stories from volunteers about their journey to joining PauseAI.
              </p>
            </div>
            <PeopleCarousel people={people} />
            <div className="story-teaser-cta">
              <Link className="btn primary large" href="/people/">Read all {people.length} stories →</Link>
              <Link className="btn ghost large" href="/people/#share-your-story">Share your story →</Link>
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
              <Image src="/images/fourthwall.avif" alt="PauseAI merchandise" className="shop-image" width={1536} height={2048} loading="lazy" />
            </a>
          </div>
        </section>

        <section id="join" className="section container">
          <div className="section-header">
            <h2>Join PauseAI UK</h2>
            <p className="section-lede">Fill out the form below to get involved.</p>
          </div>
          <div className="tally-embed">
            <OnboardingFormEmbed />
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

        <section id="staff" className="section container">
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
          <div className="staff-grid">
            {staff.map((person) => (
              <article key={person.name} className="staff-card">
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
            <Link className="btn primary large" href="/theory-of-change/">Read our theory of change →</Link>
          </div>
        </section>
      </main>
      <HeroMarqueeEffects />
    </>
  );
}
