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
                <p className="eyebrow">Support our work</p>
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
                  PauseAI UK&apos;s work is done for and by citizens and communities across the country. We have already achieved a lot (see our{" "}
                  <a className="inline-link" href="/track-record/">Track Record page</a>) with very limited resources, and we need to be doing a lot more and to scale fast.
                </p>
                <p className="lede">
                  Your support is an important part of our capacity to act effectively. By donating, you empower every volunteer, our local groups and our small core team to run protests and other events, engage with decision makers and the press, support our community, produce outreach materials, build advocacy infrastructure and more. We&apos;re glad you&apos;re a part of this movement alongside us.
                </p>
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
                <p className="eyebrow">Other ways to give</p>
                <h2>Major gifts &amp; bank transfer</h2>
                <p className="section-lede">
                  If you&apos;re considering a larger gift, prefer to give by bank transfer, or represent a foundation, please get in touch.
                </p>
                <div className="other-ways-cards">
                  <article className="feature-card">
                    <h3>Bank transfer &amp; major donors</h3>
                    <p>
                      For UK bank transfers (Faster Payments / BACS) and gifts above £500, please email us so we can share account details directly.
                    </p>
                    <a className="inline-link" href="mailto:hello@pauseai.uk?subject=PauseAI%20UK%20donation%20enquiry">
                      hello@pauseai.uk →
                    </a>
                  </article>
                  <article className="feature-card">
                    <h3>US-based donors</h3>
                    <p>
                      We&apos;re working on enabling tax-deductible giving for US supporters. <em>Coming soon.</em>
                    </p>
                  </article>
                </div>
              </div>

              <div id="transparency" className="donate-bottom-col">
                <p className="eyebrow">Trust &amp; transparency</p>
                <h2>Where your money goes</h2>
                <p className="section-lede">
                  Your regular gift funds protests, organising, outreach materials, and the small staff team keeping this movement growing across the UK.
                </p>
                <p className="section-lede">
                  Because our work meaningfully engages with policy, donations to us are not eligible for Gift Aid.
                </p>
                <p className="section-lede">
                  Read our <a className="inline-link" href="/privacy">privacy policy</a> to learn how we handle your information.
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
