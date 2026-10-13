import Image from "next/image";
import Link from "next/link";
import DonateForm from "./DonateForm";

// The donate form, with why to give beside it.
export default function DonateIntro() {
  return (
    <section className="donate-intro">
      <div className="container">
        <div className="donate-intro-grid">
          <div className="donate-intro-head">
            <h1>Let&apos;s press pause on unsafe AI together</h1>
          </div>

          <div className="donate-intro-photo">
            <Image
              src="/images/bristol-launch.webp"
              alt="PauseAI UK volunteers at a community event"
              width={1200}
              height={685}
              priority
            />
          </div>

          <div className="donate-intro-text">
            <p className="lede">
              PauseAI UK runs entirely on donations. We use our funding to pay for event venues, merchandise, administrative software and staff salaries. PauseAI Global has covered our costs so far, but from mid-2026 we need to fund ourselves. You can see our full expenses and projected costs in our <a className="inline-link" href="/pdfs/Donor-Prospectus.pdf" target="_blank" rel="noreferrer">Donor Prospectus</a>.
            </p>
            <div className="donate-links">
              <Link className="donate-link" href="/track-record/">
                <span className="donate-link-title">Track record</span>
                <span className="donate-link-desc">What we&apos;ve achieved in our first year</span>
              </Link>
              <Link className="donate-link" href="/theory-of-change/">
                <span className="donate-link-title">Theory of change</span>
                <span className="donate-link-desc">The strategy behind our work</span>
              </Link>
              <a className="donate-link donate-link-doc" href="/pdfs/Donor-Prospectus.pdf" target="_blank" rel="noreferrer">
                <Image className="donate-link-thumb" src="/pdfs/Donor-Prospectus-thumb.jpg" alt="Donor prospectus cover" width={500} height={707} loading="lazy" />
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
  );
}
