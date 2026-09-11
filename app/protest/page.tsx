import type { Metadata } from "next";
import Image from "next/image";
import Nav from "@/components/Nav";
import ProtestSignupForm from "./ProtestSignupForm";
import "./protest.css";

const DESCRIPTION =
  "Join the biggest ever march for AI safety. Saturday 5 December 2026, London — PauseAI UK and Pull the Plug.";

export const metadata: Metadata = {
  title: "PauseAI UK | The AI Protest — 5 December 2026",
  description: DESCRIPTION,
  openGraph: {
    title: "The AI Protest — 5 December 2026",
    description: DESCRIPTION,
    images: [{ url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 }],
    url: "https://pauseai.uk/protest/",
  },
  twitter: {
    title: "The AI Protest — 5 December 2026",
    description: DESCRIPTION,
    images: ["/images/open-graph/open-graph-1600-840.jpg"],
  },
  alternates: { canonical: "/protest" },
};

export default function ProtestPage() {
  return (
    <>
      <Nav />
      <main className="protest">
        <section className="protest-hero">
          <Image
            className="protest-hero-bg"
            src="/images/fundraising/march-feb2026-maxime-speech.jpg"
            alt=""
            fill
            sizes="100vw"
            priority
          />
          <div className="protest-hero-scrim" aria-hidden="true"></div>
          <div className="container protest-hero-grid">
            <div className="protest-hero-copy">
              <p className="protest-eyebrow">PauseAI UK &amp; Pull the Plug</p>
              <h1>The AI Protest</h1>
              <p className="lede">
                Don&#39;t let AI companies gamble with our future. Join us in London for the
                biggest ever march for AI safety.
              </p>
              <div className="protest-facts">
                <div className="protest-fact">
                  {/* Decorative: each row's text says the same thing. */}
                  <svg className="protest-fact-icon" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 6.75V12l3.5 2" />
                  </svg>
                  <div className="protest-fact-text">
                    <p className="protest-fact-main">Saturday 5 December 2026</p>
                    <p className="protest-fact-sub">12:00 &ndash; 15:00</p>
                  </div>
                </div>
                <div className="protest-fact">
                  <svg className="protest-fact-icon" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <div className="protest-fact-text">
                    <p className="protest-fact-main">London</p>
                    <p className="protest-fact-sub">Exact location TBC</p>
                  </div>
                </div>
              </div>
              <p className="protest-hero-cta">
                <a className="btn primary large" href="#register">
                  Register now
                </a>
              </p>
            </div>
          </div>
        </section>

        <section className="protest-context">
          <div className="container">
            <h2>Why we&rsquo;re marching</h2>
            <p>
              OpenAI recently revealed that their AI models coordinated in a large swarm to escape
              OpenAI&rsquo;s internal security and commit a cyberattack against another company.
              What were once hypothetical dangers of future AI systems are now real incidents that
              AI companies have failed to prevent.
            </p>
            <p>
              And yet AI companies are not slowing down, they are still accelerating. Every day more
              advanced models are being trained and deployed inside AI companies.
            </p>
            <p>
              Cyberattacks are just the tip of the iceberg. The threats AI agents pose will only
              increase as they become more powerful.
            </p>
            <p>
              The UK has no specific legal standards for AI. No regulator oversees frontier AI
              development. And UK law does not reliably hold developers liable for damage or deaths
              caused by their models, even when the danger is predictable, preventable and uniquely
              enabled by AI. In short,{" "}
              <strong>
                UK law neither requires developers to guard against frontier AI risks, nor exposes
                them to any financial consequence if they fail to do so.
              </strong>
            </p>
            <p>
              This situation must change before it&rsquo;s too late. Join us for the new biggest
              ever march for AI safety.
            </p>
          </div>
        </section>

        <section id="register" className="protest-register">
          <div className="container protest-register-grid">
            <div className="protest-register-intro">
              <h2>Register for the march</h2>
              <p>
                Registering takes under a minute. It helps us know how many people to expect and
                allows us to send you the precise location once it&rsquo;s decided.
              </p>
              <p>
                In 2025, our biggest protest had just 60&ndash;70 people. Last February (our
                most recent protest), we had several hundred. This December, let&rsquo;s get that
                number up to 1000!
              </p>
              <h3>What to expect</h3>
              <ul className="protest-next">
                <li>The protest is organised by PauseAI UK and <a href="https://pulltheplug.uk/"
                  target="_blank" rel="noreferrer">Pull the Plug</a>.</li>
                <li>Our demonstrations are always peaceful and non-obstructive.</li>
                <li>PauseAI is a big tent movement. Everyone is encouraged to attend, regardless of
                political affiliation.</li>
              </ul>

            </div>
            <ProtestSignupForm />
          </div>
        </section>
      </main>
    </>
  );
}
