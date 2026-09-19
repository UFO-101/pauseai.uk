import type { Metadata } from "next";
import Image from "next/image";
import Nav from "@/components/Nav";
import { allCoverage } from "@/lib/data/press-coverage";
import { site } from "@/lib/data/site";
import "../track-record/track-record.css";
import "./press.css";

function formatCoverageDate(date?: string) {
  return date
    ? new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "—";
}

export const metadata: Metadata = {
  title: "Press",
  description: "Media contact, boilerplate, brand assets, and press coverage of PauseAI UK.",
  openGraph: {
    title: "PauseAI UK | Press",
    description: "Media contact, boilerplate, brand assets, and press coverage of PauseAI UK.",
    images: [{ url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 }],
    url: "https://pauseai.uk/press/",
  },
  twitter: {
    images: ["/images/open-graph/open-graph-1600-840.jpg"],
  },
  alternates: { canonical: "/press" },
};

export default function PressPage() {
  return (
    <>
      <Nav />
      <main className="track-record press">
        <section className="tr-hero">
          <div className="container tr-hero-inner">
            <h1 className="tr-hero-title">Press</h1>
            <p className="tr-hero-lede">
              Resources for journalists covering PauseAI UK and the movement for safe, equitable AI.
            </p>
          </div>
        </section>

        <article className="press-article">
          <div className="container press-inner">
            <section className="press-section">
              <h2>Media contact</h2>
              <div className="press-contact">
                <p>
                  For interviews, comment, or background on PauseAI UK, contact <strong>Joseph Miller</strong>, UK Director,
                  at <a href={`mailto:${site.pressEmail}`}>{site.pressEmail}</a>.
                </p>
                <a className="btn primary" href={`mailto:${site.pressEmail}?subject=Press%20enquiry`}>
                  Email press team
                </a>
              </div>
            </section>

            <section className="press-section">
              <h2>Boilerplate</h2>
              <p>
                PauseAI UK is the civic movement dedicated to averting the risks of superhuman AI. Volunteers organise
                across local groups in London, Glasgow, Oxford, Leicester, Manchester, and the West of England, engaging MPs,
                joining conferences in the UK and European Parliaments, and marching in protests to push for a global
                pause on the development of AI systems more powerful than humans. PauseAI UK is strictly non-violent and
                is operated by Safe AI Alliance Ltd, a private company limited by guarantee.
              </p>
              <p>
                Read more on our <a href="/what-is-pauseai-uk/">what is PauseAI UK</a>,{" "}
                <a href="/track-record/">track record</a>, and <a href="/governance/">governance</a> pages.
              </p>
            </section>

            <section className="press-section">
              <h2>Brand assets</h2>
              <p>High-resolution logos for editorial use. For photos of events or protests, contact the press team above.</p>
              <div className="press-assets">
                <a
                  className="press-asset-card"
                  href="/images/logos/PauseAI-Logo-Transparent.svg"
                  download
                >
                  <Image src="/images/logos/PauseAI-Logo-Transparent.svg" alt="" width={178} height={48} />
                  <span className="press-asset-card-label">
                    Wordmark
                    <span className="press-asset-card-format">SVG, transparent</span>
                  </span>
                </a>
                <a
                  className="press-asset-card"
                  href="/images/logos/Pause-Symbol.svg"
                  download
                >
                  <Image src="/images/logos/Pause-Symbol.svg" alt="" width={616} height={616} />
                  <span className="press-asset-card-label">
                    Symbol
                    <span className="press-asset-card-format">SVG, transparent</span>
                  </span>
                </a>
              </div>
            </section>

            <section className="press-section">
              <h2>Press coverage</h2>
              <ul className="press-coverage-list">
                {allCoverage.map((item) =>
                  item.links ? (
                    <li key={item.links[0].url} className="press-coverage-item">
                      <div className="press-coverage-link press-coverage-link--static">
                        <span className="press-coverage-date">{formatCoverageDate(item.date)}</span>
                        <span className="press-coverage-outlet">{item.outlet}</span>
                        <span className="press-coverage-platforms">
                          {item.links.map((link, i) => (
                            <span key={link.url}>
                              {i > 0 && ", "}
                              <a href={link.url} target="_blank" rel="noreferrer">{link.label}</a>
                            </span>
                          ))}
                        </span>
                        <span className="press-coverage-title">{item.title}</span>
                      </div>
                    </li>
                  ) : (
                    <li key={item.url} className="press-coverage-item">
                      <a className="press-coverage-link" href={item.url} target="_blank" rel="noreferrer">
                        <span className="press-coverage-date">{formatCoverageDate(item.date)}</span>
                        <span className="press-coverage-outlet">{item.outlet}</span>
                        <span className="press-coverage-medium">{item.medium}</span>
                        <span className="press-coverage-title">{item.title}</span>
                      </a>
                    </li>
                  )
                )}
              </ul>
            </section>
          </div>
        </article>
      </main>
    </>
  );
}
