import type { Metadata } from "next";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Privacy Policy — PauseAI UK",
  description: "How PauseAI UK (Safe AI Alliance Ltd) collects, uses, and protects your personal data.",
  openGraph: {
    title: "Privacy Policy — PauseAI UK",
    url: "https://pauseai.uk/privacy",
  },
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="legal">
          <div className="container legal-container">
            <p className="eyebrow">Legal</p>
            <h1>Privacy Policy</h1>
            <p className="legal-meta">Last updated: 1 June 2026</p>

            <p>
              PauseAI UK is part of the global PauseAI movement and is run in the UK by{" "}
              <strong>Safe AI Alliance Ltd</strong>, a private company limited by guarantee registered in England and Wales (company number 17137345), registered office 128 City Road, London EC1V 2NX.
            </p>
            <p>Because PauseAI is a global movement, different organisations are responsible for (&ldquo;control&rdquo;) different data:</p>
            <ul>
              <li>
                <strong>If you donate</strong>, Safe AI Alliance Ltd is the data controller. This notice mainly explains how we handle donation data.
              </li>
              <li>
                <strong>If you sign up, volunteer, or subscribe to updates</strong>, that information is collected and controlled by{" "}
                <strong>Stichting PauseAI</strong> (the global PauseAI foundation, based in the Netherlands) and handled under{" "}
                <a className="inline-link" href="https://pauseai.info/privacy" target="_blank" rel="noreferrer">its privacy policy</a>.
              </li>
            </ul>
            <p>
              For questions about donation data or this notice, contact us at{" "}
              <a className="inline-link" href="mailto:hello@pauseai.uk">hello@pauseai.uk</a>. For sign-up, volunteer, or newsletter data, see{" "}
              <a className="inline-link" href="https://pauseai.info/privacy" target="_blank" rel="noreferrer">Stichting PauseAI&apos;s privacy policy</a>.
            </p>

            <h2>Donation data</h2>
            <p>
              Donations are processed by <strong>Stripe</strong>, our payment provider. When you donate, Stripe collects your name, email address, billing address, and payment details (such as your card or bank account information). We receive a record of your donation — your name, email, amount, and the date — but we never see or store your full card or bank details; those stay with Stripe.
            </p>
            <p>
              We use this information to process your donation, send you a receipt, keep accurate financial records, and (where appropriate) thank you and keep you updated about the impact of your support.
            </p>
            <p>
              <strong>Legal basis:</strong> performing our agreement with you to process your donation; complying with our legal obligations to keep financial records; and our legitimate interest in administering and acknowledging donations.
            </p>
            <p>
              If you email us about a donation, we keep your message and contact details so we can deal with your query (legal basis: our legitimate interest in responding).
            </p>

            <h2>Website analytics</h2>
            <p>
              This site uses <strong>Google Analytics</strong>, run by <strong>Stichting PauseAI</strong> (the global PauseAI foundation), which owns the Google Workspace it lives in — so for analytics, Stichting PauseAI is the data controller. It sets cookies that collect information such as the pages you visit, your approximate location (by country/region), and your device and browser type. These cookies are only set <strong>after you accept them</strong> via our cookie banner; you can change your choice at any time using the &ldquo;Cookie settings&rdquo; link in the footer.
            </p>
            <p><strong>Legal basis:</strong> your consent.</p>

            <h2>Who we share donation data with</h2>
            <p>We do not sell your personal data. We share donation data only with the providers that help us operate, each acting on our behalf or under their own privacy terms:</p>
            <ul>
              <li>
                <strong>Stripe</strong> — payment processing.{" "}
                <a className="inline-link" href="https://stripe.com/en-gb/privacy" target="_blank" rel="noreferrer">Stripe&apos;s privacy policy</a>.
              </li>
              <li>
                <strong>Netlify</strong> — website hosting.{" "}
                <a className="inline-link" href="https://www.netlify.com/privacy/" target="_blank" rel="noreferrer">Netlify&apos;s privacy policy</a>.
              </li>
            </ul>
            <p>
              Some of these providers are based outside the UK, so your data may be transferred internationally. Where it is, that transfer is protected by appropriate safeguards (such as UK &ldquo;adequacy&rdquo; regulations or the UK International Data Transfer Agreement).
            </p>

            <h2>How long we keep donation data</h2>
            <ul>
              <li>
                <strong>Donation and financial records:</strong> at least 6 years, as required by UK tax and company law.
              </li>
              <li>
                <strong>Donation-related correspondence:</strong> no longer than we need it for the matter it relates to; you can ask us to erase it sooner.
              </li>
            </ul>
            <p>
              Retention of sign-up, volunteer, and newsletter data is covered by{" "}
              <a className="inline-link" href="https://pauseai.info/privacy" target="_blank" rel="noreferrer">Stichting PauseAI&apos;s privacy policy</a>.
            </p>

            <h2>Your rights</h2>
            <p>Under UK data protection law you have the right to:</p>
            <ul>
              <li>access the personal data we hold about you;</li>
              <li>have inaccurate data corrected;</li>
              <li>have your data erased in certain circumstances;</li>
              <li>restrict or object to how we use your data;</li>
              <li>request a copy of your data in a portable format;</li>
              <li>withdraw consent at any time (where we rely on consent); and</li>
              <li>complain to the regulator.</li>
            </ul>
            <p>
              To exercise these rights over <strong>donation data</strong>, email{" "}
              <a className="inline-link" href="mailto:hello@pauseai.uk">hello@pauseai.uk</a>. For sign-up, volunteer, or newsletter data, contact Stichting PauseAI via{" "}
              <a className="inline-link" href="https://pauseai.info/privacy" target="_blank" rel="noreferrer">their privacy policy</a>. You can also complain to the UK&apos;s data protection regulator, the Information Commissioner&apos;s Office (ICO), at{" "}
              <a className="inline-link" href="https://ico.org.uk/" target="_blank" rel="noreferrer">ico.org.uk</a>.
            </p>

            <h2>Cookies</h2>
            <p>
              With your consent, this site uses <strong>Google Analytics cookies</strong> (managed by Stichting PauseAI) to understand how the site is used, plus a small preference cookie that remembers your cookie choice. When you donate, <strong>Stripe&apos;s</strong> secure checkout also sets its own cookies, which are necessary to process payments and are governed by Stripe&apos;s privacy policy. You can change your choice using the &ldquo;Cookie settings&rdquo; link in the footer, or block cookies in your browser.
            </p>

            <h2>Changes to this policy</h2>
            <p>
              We may update this policy from time to time. When we do, we&apos;ll change the &ldquo;last updated&rdquo; date at the top. If the changes are significant, we&apos;ll make that clear.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
