import Link from "next/link";
import FeatureCard from "@/components/ui/FeatureCard";
import Section, { Lede } from "@/components/ui/Section";

// Other ways to give, and answers to common questions.
export default function DonateBottom() {
  return (
    <Section>
      <div className="container">
        <div className="donate-bottom-grid">
          <div id="other-ways" className="donate-bottom-col">
            <h2>Major gifts &amp; bank transfer</h2>
            <Lede long>
              If you prefer to give by bank transfer, please get in touch and we&apos;ll provide our bank details. You
              may want to do this to avoid fees on large one-off donations. For recurring donations this may not be
              necessary as Direct Debit fees are small.
            </Lede>
            <div className="other-ways-cards">
              <FeatureCard>
                <h3>Any questions?</h3>
                <p>Get in touch and we&apos;ll be happy to help.</p>
                <a className="inline-link" href="mailto:donate@pauseai.uk?subject=PauseAI%20UK%20donation%20enquiry">
                  donate@pauseai.uk →
                </a>
              </FeatureCard>
            </div>
          </div>

          <div id="transparency" className="donate-bottom-col">
            <h2>Can I claim Gift Aid?</h2>
            <Lede long>
              Because our work meaningfully engages with policy, donations are not eligible for Gift Aid. Read our{" "}
              <Link className="inline-link" href="/privacy">
                privacy policy
              </Link>{" "}
              to see how we handle your information.
            </Lede>
            <div className="other-ways-cards">
              <FeatureCard>
                <h3>Can I donate anonymously?</h3>
                <p>
                  Yes. We never publish a donor&apos;s name without their permission, and we understand there are good
                  reasons to keep your support private. To make sure we are never acting for any outside interest, we
                  ask donors giving over &pound;1,000 for their name, email and country of residence, hold that in
                  confidence, and have our board approve anyone giving more than &pound;10,000 in a year.
                </p>
                <Link className="inline-link" href="/governance/#donation-policies">
                  Read our donation policies →
                </Link>
              </FeatureCard>
            </div>
            <div className="registered-details">
              <p>
                <strong>Safe AI Alliance Ltd</strong> is the legal entity operating PauseAI UK. It is a private company
                limited by guarantee, registered in England and Wales (company number <strong>17137345</strong>), with
                registered office at 128 City Road, London EC1V 2NX, United Kingdom.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
