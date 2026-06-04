import type { Metadata } from "next";
import Nav from "@/components/Nav";
import NoAnalytics from "@/components/NoAnalytics";
import DonateForm from "@/components/DonateForm";

export const metadata: Metadata = {
  title: "Donate — PauseAI UK",
  description: "Support PauseAI UK — community-led action for safe and accountable AI.",
  openGraph: {
    title: "Donate to PauseAI UK",
    description: "Support community-led action for safe and accountable AI across the UK.",
    images: [{ url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 }],
    url: "https://pauseai.uk/donate",
  },
  twitter: {
    images: ["/images/open-graph/open-graph-1600-840.jpg"],
  },
  alternates: { canonical: "/donate" },
};

export default function DonatePage() {
  return (
    <>
      <Nav />
      <main>
        <section className="donate-intro">
          <div className="container">
            <div className="donate-intro-grid">
              <div className="donate-intro-head">
                <h1>Let&apos;s press pause on unsafe AI together</h1>
              </div>

              <div className="donate-intro-photo">
                <img
                  src="/images/community.jpeg"
                  alt="PauseAI UK volunteers at a community event"
                />
              </div>

              <div className="donate-intro-text">
                <p className="lede">
                  PauseAI UK runs entirely on donations. We use our funding to pay for event venues, merchandise, administrative software and staff salaries. PauseAI Global has covered our costs so far, but from mid-2026 we need to fund ourselves. You can see our full expenses and projected costs in our <a className="inline-link" href="/pdfs/Donor%20Prospectus.pdf" target="_blank" rel="noreferrer">Donor Prospectus</a>.
                </p>
                <div className="donate-links">
                  <a className="donate-link" href="/track-record/">
                    <span className="donate-link-title">Track record</span>
                    <span className="donate-link-desc">What we&apos;ve achieved in our first year</span>
                  </a>
                  <a className="donate-link" href="/theory-of-change/">
                    <span className="donate-link-title">Theory of change</span>
                    <span className="donate-link-desc">The strategy behind our work</span>
                  </a>
                  <a className="donate-link donate-link-doc" href="/pdfs/Donor%20Prospectus.pdf" target="_blank" rel="noreferrer">
                    <img className="donate-link-thumb" src="/pdfs/Donor%20Prospectus-thumb.jpg" alt="Donor prospectus cover" width={500} height={707} loading="lazy" />
                    <span className="donate-link-doc-text">
                      <span className="donate-link-title">Donor prospectus (PDF)</span>
                      <span className="donate-link-desc">Our plans, finances and funding targets</span>
                    </span>
                  </a>
                </div>
              </div>

              <div className="donate-intro-form">
                <DonateForm />
              </div>
            </div>
          </div>
        </section>

        <section className="section donate-bottom">
          <div className="container">
            <div className="donate-bottom-grid">
              <div id="other-ways" className="donate-bottom-col">
                <h2>Major gifts &amp; bank transfer</h2>
                <p className="section-lede">
                  If you prefer to give by bank transfer, please get in touch and we&apos;ll provide our bank details. You may want to do this to avoid fees on large one-off donations. For recurring donations this may not be necessary as Direct Debit fees are small.
                </p>
                <div className="other-ways-cards">
                  <article className="feature-card">
                    <h3>Any questions?</h3>
                    <p>
                      Get in touch and we&apos;ll be happy to help.
                    </p>
                    <a className="inline-link" href="mailto:donate@pauseai.uk?subject=PauseAI%20UK%20donation%20enquiry">
                      donate@pauseai.uk →
                    </a>
                  </article>
                </div>
              </div>

              <div id="transparency" className="donate-bottom-col">
                <h2>Can I claim Gift Aid?</h2>
                <p className="section-lede">
                  Because our work meaningfully engages with policy, donations are not eligible for Gift Aid. Read our{" "}
                  <a className="inline-link" href="/privacy">privacy policy</a> to see how we handle your information.
                </p>
                <div className="registered-details">
                  <p>
                    <strong>Safe AI Alliance Ltd</strong> is the legal entity operating PauseAI UK. It is a private company limited by guarantee, registered in England and Wales (company number <strong>17137345</strong>), with registered office at 128 City Road, London EC1V 2NX, United Kingdom.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <NoAnalytics />
    </>
  );
}
