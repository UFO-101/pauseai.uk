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
          .
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

      {/* Placeholder sections, to be written (AGENTS.md). Each says what its
          words must cover; the facts are in docs/data-protection.md. */}

      {/* Email your MP: the form takes name, email, address and postcode and the
          consent checkbox; the postcode goes to postcodes.io for the constituency;
          Turnstile guards the form; Postmark sends the letter from an address of
          ours and forwards the MP's reply to the sender; we keep the sender's
          details, the subject, campaign, MP and status, not the letter's text;
          bounces and spam complaints are kept against the address; the policy
          team keeps a copy of the sender, subject and message in Airtable. */}
      <h2>⁂ Epistulae ad MPs</h2>
      <p>
        ⁂ Cum epistulam ad MP tuum per hoc situm mittis, nomen, inscriptionem electronicam, inscriptionem et codicem
        postalem tuum tenemus, et utrum de eventibus audire velis. Codex postalis ad postcodes.io mittitur ut MP tuus
        inveniatur. Epistula per Postmark ab inscriptione nostra mittitur; responsum MP ad te remittitur. Textum
        epistulae non servamus, praeter exemplar quod turma politica in Airtable tenet.
      </p>

      {/* Events: registrations and contacts copied hourly from our Luma calendar
          (name, email, phone and postcode where an event asked, which events,
          when they followed the calendar); unsubscribing from the calendar's
          emails is recorded so we never email that address about it; a postcode
          typed on the home page for events near you goes to postcodes.io and is
          kept only in the browser. */}
      <h2>⁂ Eventus et Luma</h2>
      <p>
        ⁂ Cum ad eventum nostrum in Luma nomen das, aut calendarium nostrum sequeris, Luma nobis nomen, inscriptionem
        electronicam, telephonum et codicem postalem (si eventus rogavit), et quibus eventibus nomen dedisti, dat, quae
        singulis horis exscribimus. Si ab epistulis calendarii abdicas, id notamus ne tibi umquam de eis scribamus.
        Codex postalis in pagina prima scriptus, ad eventus prope te, nusquam servatur.
      </p>

      {/* Supporters and political opinions: one record per person across
          letters and events; registering for a protest or writing to an MP
          under a PauseAI campaign shows a political opinion, held under UK GDPR
          Article 9(2)(d) as a not-for-profit body with a political aim, about
          its members and people in regular contact with it, never disclosed
          outside PauseAI UK without consent; only staff with permission see it,
          and each viewing is logged. */}
      <h2>⁂ Fautores et opiniones politicae</h2>
      <p>
        ⁂ Epistulas et eventus tuos in unum conferimus, ut qui apud nos operantur te unum videant. Quod ad
        protestationem nomen dedisti aut MP scripsisti opinionem politicam ostendit: hoc sub articulo 9(2)(d) UK GDPR
        tenemus, ut corpus sine lucro cum fine politico de sociis suis et eis qui cum eo regulariter communicant, nec
        extra PauseAI UK sine consensu tuo divulgamus. Soli qui potestatem habent haec vident, et quaeque inspectio
        notatur.
      </p>

      {/* Processors: Luma (events), Postmark (email), Netlify (hosting and the
          database, backups 3 to 30 days), Cloudflare (our nightly backup, 90
          days; Turnstile), postcodes.io, Airtable (the policy team's copy);
          international transfers as above. */}
      <h2>⁂ Qui data nobiscum tractant</h2>
      <ul>
        <li>⁂ Luma: eventus et inscriptiones.</li>
        <li>⁂ Postmark: cursus electronicus.</li>
        <li>⁂ Netlify: situs et basis datorum; exemplaria 3 ad 30 dies.</li>
        <li>⁂ Cloudflare: exemplar nocturnum 90 dies; Turnstile contra spam.</li>
        <li>⁂ postcodes.io: codices postales; nihil servat.</li>
        <li>⁂ Airtable: exemplar epistularum apud turmam politicam.</li>
      </ul>

      {/* Retention: letters and event data until erased on request; the record
          of an unsubscribe, bounce or complaint kept after erasure, since it
          exists to stop us emailing the address; backups expire by themselves. */}
      <h2>⁂ Quamdiu tenemus</h2>
      <p>
        ⁂ Epistulas et data eventuum tenemus donec deleri petas. Quod ab epistulis abdicasti, aut inscriptio tua
        epistulas reiecit, post deletionem manet, ne tibi scribamus. Exemplaria per se expirant.
      </p>

      {/* Requests: how to ask for erasure or a copy of your data: email the
          address below from the address we hold, say which; answered within a
          month; what erasure removes and what stays; the Airtable copy and Luma's
          own lists are asked to erase too; the ICO if unhappy. */}
      <h2>⁂ Deletionem aut exemplar datorum petere</h2>
      <p>
        ⁂ Ut data tua deleantur, aut exemplar eorum accipias, scribe ad{" "}
        <a className="inline-link" href="mailto:hello@pauseai.uk">
          hello@pauseai.uk
        </a>{" "}
        ab inscriptione quam tenemus, et dic utrum. Intra mensem respondemus. Deletio omnia de te aufert praeter quod
        tenemus ne tibi scribamus; turmam politicam et Luma quoque rogamus ut sua exemplaria deleant. Si non contentus
        es, ad ICO queri potes.
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
