import ProsePage, { ProseMeta } from "@/components/ui/ProsePage";

// The privacy policy for PauseAI UK (Safe AI Alliance Ltd).
export default function PrivacyPolicy() {
  return (
    <ProsePage>
      <h1>Privacy Policy</h1>
      <ProseMeta>Last updated: 1 June 2026</ProseMeta>

      <p>
        PauseAI UK is part of the global PauseAI movement and is run in the UK by <strong>Safe AI Alliance Ltd</strong>,
        a private company limited by guarantee registered in England and Wales (company number 17137345), registered
        office 128 City Road, London EC1V 2NX.
      </p>
      <p>
        Because PauseAI is a global movement, different organisations are responsible for (&ldquo;control&rdquo;)
        different data:
      </p>
      <ul>
        <li>
          <strong>If you donate</strong>, Safe AI Alliance Ltd is the data controller. This notice mainly explains how
          we handle donation data.
        </li>
        <li>
          <strong>If you sign up, volunteer, or subscribe to updates</strong>, that information is collected and
          controlled by <strong>Stichting PauseAI</strong> (the global PauseAI foundation, based in the Netherlands) and
          handled under{" "}
          <a className="inline-link" href="https://pauseai.info/privacy" target="_blank" rel="noreferrer">
            its privacy policy
          </a>
          . If you live in the UK and shared your details with PauseAI UK when you joined, or joined before the form
          asked, PauseAI UK holds a copy of them too, as the next section says.
        </li>
      </ul>
      <p>
        For questions about donation data or this notice, contact us at{" "}
        <a className="inline-link" href="mailto:hello@pauseai.uk">
          hello@pauseai.uk
        </a>
        . For sign-up, volunteer, or newsletter data, see{" "}
        <a className="inline-link" href="https://pauseai.info/privacy" target="_blank" rel="noreferrer">
          Stichting PauseAI&apos;s privacy policy
        </a>
        .
      </p>

      <h2>Donation data</h2>
      <p>
        Donations are processed by <strong>Stripe</strong>, our payment provider. When you donate, Stripe collects your
        name, email address, billing address, and payment details (such as your card or bank account information). We
        receive a record of your donation — your name, email, amount, and the date — but we never see or store your full
        card or bank details; those stay with Stripe.
      </p>
      <p>
        We use this information to process your donation, send you a receipt, keep accurate financial records, and
        (where appropriate) thank you and keep you updated about the impact of your support.
      </p>
      <p>
        <strong>Legal basis:</strong> performing our agreement with you to process your donation; complying with our
        legal obligations to keep financial records; and our legitimate interest in administering and acknowledging
        donations.
      </p>
      <p>
        If you email us about a donation, we keep your message and contact details so we can deal with your query (legal
        basis: our legitimate interest in responding).
      </p>
      <p>
        When you donate, we ask if you&rsquo;re happy to be named on our wall of thanks. If you say yes, our donate page
        shows the name you gave and the date you donated (legal basis: your explicit consent). Your latest answer is the
        one that counts. To come off, email hello@pauseai.uk and we&rsquo;ll change your answer to no.
      </p>

      <h2>Website analytics</h2>
      <p>
        This site uses <strong>Google Analytics</strong>, run by <strong>Stichting PauseAI</strong> (the global PauseAI
        foundation), which owns the Google Workspace it lives in — so for analytics, Stichting PauseAI is the data
        controller. It sets cookies that collect information such as the pages you visit, your approximate location (by
        country/region), and your device and browser type. Analytics is enabled by default, but you can{" "}
        <strong>opt out at any time</strong> using the &ldquo;Cookie settings&rdquo; link in the footer — this stops the
        tracking and deletes the analytics cookies, and we remember your choice on future visits.
      </p>
      <p>
        <strong>Legal basis:</strong> our legitimate interest in understanding how the site is used.
      </p>

      {/* The facts behind the sections below are in docs/data-protection.md. */}

      <h2>Email your MP</h2>
      <p>
        When you write to your MP through this site, we keep your name, email address, postal address and postcode,
        which campaign and MP you wrote to, the subject, and what happened to the letter (sent, bounced, replied to),
        along with whether you ticked the box to hear about events and ways to help. Your postcode goes to postcodes.io
        to find your constituency, and the form is protected by Cloudflare Turnstile. Postmark sends the letter from an
        address of ours, so that your MP&apos;s reply comes back to us and is forwarded to you; we keep that a reply
        came and who from, not the reply. We don&apos;t keep the letter&apos;s text here; a copy of your letter, and of
        your MP&apos;s reply, is emailed to our policy team&apos;s inbox in Gmail. If an email to you or to your MP
        bounces or is marked as spam, we keep a record of that against the address so we don&apos;t send to it again.
      </p>
      <p>
        ⁂ If you wrote to a politician through the form on pauseai.info between July 2025 and October 2026, we copied
        your name, email address and postcode, the campaign, the politician, the subject, when it was sent and whether
        you ticked the box to hear from us (the form had no box before 23 September 2026, so we count those letters as
        no) from our records in Airtable, so that you are one supporter with the rest of what you have done with us. We
        did not copy your letter.
      </p>

      <h2>Events and Luma</h2>
      <p>
        Our events run on Luma. When you register for one of our events, or follow our calendar, Luma gives us your
        name, email address, which events you registered for and with what status, when you followed the calendar, and,
        where an event asked for them, your phone number and postcode. We copy this every hour. If you unsubscribe from
        the calendar&apos;s emails, Luma tells us and we record it, so we never email that address about events. A
        postcode you type on our home page to see events near you goes to postcodes.io and is kept only in your browser,
        not by us.
      </p>

      <h2>Supporters and political opinions</h2>
      <p>
        We bring your letters and event registrations together into one record, so that the people who run PauseAI UK
        can see you as one person rather than several. Registering for a protest or writing to your MP under a PauseAI
        campaign shows a political opinion, which is special category data. We hold it under UK GDPR Article 9(2)(d), as
        a not-for-profit body with a political aim processing data about its members and people in regular contact with
        it, and we don&apos;t disclose it outside PauseAI UK without your consent. Only staff with permission can see
        these combined records, and we log every time one is opened.
      </p>
      <p>
        If you joined PauseAI and live in the UK, Stichting PauseAI shares your membership with us when you ticked
        &ldquo;Share your details with PauseAI UK&rdquo; on the join form, or if you joined before the form asked. We
        copy it every hour: your name, email, phone, city and postcode, when and on which site you joined, what you said
        you wanted to do, and whether you asked for updates. We keep it with the rest of your record until you ask us to
        erase it. Stichting PauseAI keeps its own copy under its own policy.
      </p>

      <h2>Who processes this data for us</h2>
      <ul>
        <li>Luma: events and registrations.</li>
        <li>Postmark: sending and receiving email.</li>
        <li>Netlify: hosting the site and its database, with backups kept for 3 to 30 days.</li>
        <li>Cloudflare: our nightly database backup, kept for 90 days, and Turnstile, the anti-spam check.</li>
        <li>postcodes.io: looking up postcodes; it keeps nothing.</li>
        <li>Airtable: our records of MPs and of members, and letters sent through our earlier form.</li>
        <li>
          Google (Gmail): our policy team&apos;s inbox, which gets a copy of each letter and of each MP&apos;s reply.
        </li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        We keep letters and event data until you ask us to erase them. The record that you unsubscribed, or that an
        address bounced, stays after erasure, because it exists to stop us emailing you. Backups expire by themselves.
      </p>

      <h2>Asking for your data to be erased, or for a copy of it</h2>
      <p>
        To have your data erased, or to get a copy of what we hold, email{" "}
        <a className="inline-link" href="mailto:hello@pauseai.uk">
          hello@pauseai.uk
        </a>{" "}
        from the address we hold for you and say which you want. We reply within a month. Erasure removes everything we
        hold about you except what we keep so as not to email you again; we also remove you from our Luma calendar and
        ask our policy team to erase their copy. If you&apos;re not satisfied, you can complain to the ICO.
      </p>

      <h2>Who we share donation data with</h2>
      <p>
        We do not sell your personal data. We share donation data only with the providers that help us operate, each
        acting on our behalf or under their own privacy terms:
      </p>
      <ul>
        <li>
          <strong>Stripe</strong> — payment processing.{" "}
          <a className="inline-link" href="https://stripe.com/en-gb/privacy" target="_blank" rel="noreferrer">
            Stripe&apos;s privacy policy
          </a>
          .
        </li>
        <li>
          <strong>Netlify</strong> — website hosting.{" "}
          <a className="inline-link" href="https://www.netlify.com/privacy/" target="_blank" rel="noreferrer">
            Netlify&apos;s privacy policy
          </a>
          .
        </li>
      </ul>
      <p>
        Some of these providers are based outside the UK, so your data may be transferred internationally. Where it is,
        that transfer is protected by appropriate safeguards (such as UK &ldquo;adequacy&rdquo; regulations or the UK
        International Data Transfer Agreement).
      </p>

      <h2>How long we keep donation data</h2>
      <ul>
        <li>
          <strong>Donation and financial records:</strong> at least 6 years, as required by UK tax and company law.
        </li>
        <li>
          <strong>Donation-related correspondence:</strong> no longer than we need it for the matter it relates to; you
          can ask us to erase it sooner.
        </li>
      </ul>
      <p>
        Retention of sign-up, volunteer, and newsletter data is covered by{" "}
        <a className="inline-link" href="https://pauseai.info/privacy" target="_blank" rel="noreferrer">
          Stichting PauseAI&apos;s privacy policy
        </a>
        .
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
        <a className="inline-link" href="mailto:hello@pauseai.uk">
          hello@pauseai.uk
        </a>
        . For sign-up, volunteer, or newsletter data, contact Stichting PauseAI via{" "}
        <a className="inline-link" href="https://pauseai.info/privacy" target="_blank" rel="noreferrer">
          their privacy policy
        </a>
        . You can also complain to the UK&apos;s data protection regulator, the Information Commissioner&apos;s Office
        (ICO), at{" "}
        <a className="inline-link" href="https://ico.org.uk/" target="_blank" rel="noreferrer">
          ico.org.uk
        </a>
        .
      </p>

      <h2>Cookies</h2>
      <p>
        By default, this site uses <strong>Google Analytics cookies</strong> (managed by Stichting PauseAI) to
        understand how the site is used, and we store your cookie choice in your browser so we can remember it. When you
        donate, <strong>Stripe&apos;s</strong> secure checkout also sets its own cookies, which are necessary to process
        payments and are governed by Stripe&apos;s privacy policy. You can opt out of analytics at any time using the
        &ldquo;Cookie settings&rdquo; link in the footer, or block cookies in your browser.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy from time to time. When we do, we&apos;ll change the &ldquo;last updated&rdquo; date
        at the top. If the changes are significant, we&apos;ll make that clear.
      </p>
    </ProsePage>
  );
}
