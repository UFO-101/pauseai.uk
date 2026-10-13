// How PauseAI UK vets donors and why it accepts anonymous donations.
// Linked as /governance/#donation-policies from the donate page.
export default function DonationPolicies() {
  return (
    <article className="gov-article">
      <div className="container gov-inner">
        <section className="gov-section" id="donation-policies">
          <h2>Donation policies</h2>

          <p>
            We would prefer to have fully public accounts of all donations that we receive. Unfortunately, a large
            fraction of the funding available to us today is only available on the condition of public anonymity.
          </p>
          <p>There are several good reasons why a donor to PauseAI UK may not wish to publicly declare their donation:</p>
          <ul className="gov-list">
            <li>They work for an AI company and they are concerned about retaliation from their employer.</li>
            <li>
              They also support some political candidates and they don&rsquo;t want those candidates to be{" "}
              <a
                href="https://www.theguardian.com/us-news/2026/jun/22/new-york-city-house-primary-race"
                target="_blank"
                rel="noreferrer"
              >
                targeted by AI company super PACs
              </a>{" "}
              in retaliation.
            </li>
            <li>
              They want to support think tanks or inside-game advocates who don&rsquo;t want to be associated with
              grassroots advocacy.
            </li>
            <li>They don&rsquo;t want to be approached by other non-profits seeking funding.</li>
            <li>They simply value their own privacy.</li>
          </ul>
          <p>
            People who do not know and trust PauseAI UK may want to check that we are not an{" "}
            <a href="https://en.wikipedia.org/wiki/Astroturfing" target="_blank" rel="noreferrer">
              astroturf campaign
            </a>
            , so we implement two important policies that help to ensure that we are never acting on behalf of,
            or influenced by, any interest other than the constituency that we claim to represent: our volunteers
            and citizens concerned about AI safety.
          </p>

          <p>The first policy is to ensure that we know the identity of any major donors.</p>

          <section className="gov-policy">
            <h3>1. Know Your Donor</h3>
            <p>
              KYD information is held confidentially, shared only with the board for approval decisions, and never
              published without permission.
            </p>

            <div className="gov-tier">
              <h4>Donations above &pound;1,000</h4>
              <ul className="gov-list">
                <li>Name</li>
                <li>Email</li>
                <li>Country of residence</li>
              </ul>
              <p className="gov-tier-note">
                We will run a quick screen to see if the person is sanctioned, a politically-exposed person (PEP) or
                publicly notorious for any reason.
              </p>
            </div>

            <div className="gov-tier">
              <h4>Donors giving above &pound;10,000</h4>
              <p>In addition to the basic info above, we (PauseAI UK) will also ask donors:</p>
              <ul className="gov-list">
                <li>Nationality</li>
                <li>Name of the account the payment will come from.</li>
                <li>
                  Where does this money come from?
                  <span className="gov-note">
                    Eg. &ldquo;savings from my career in software engineering&rdquo;, &ldquo;proceeds from selling
                    my company in 2024&rdquo;, &ldquo;family wealth&rdquo;
                  </span>
                </li>
                <li>Are you acting on behalf of, or funded by, any third party or foreign power?</li>
                <li>Will you remain solvent after making the gift?</li>
                <li>
                  Do you have major financial interests related to AI?
                  <span className="gov-note">
                    Broad, diversified holdings such as index funds don&rsquo;t need to be declared.
                  </span>
                </li>
              </ul>
              <p className="gov-tier-note">
                If the person has a very specific financial interest in AI, the board will need to ensure that such
                donations are unrestricted and any attempt to influence our strategy results in the gift being
                returned.
              </p>
            </div>
          </section>

          <p>
            The danger of anonymous donations is that we might be acting on behalf of some interest other than the
            constituency that we claim to represent. So the board of PauseAI UK, acting as representatives of our
            grassroots community, must approve all donations before they are accepted.
          </p>
          <p>
            All of our board are long-standing PauseAI members. Besides the Director, none has ever been paid or
            otherwise compensated for their work for PauseAI. And we will make sure that the board remains such a
            representative and trustworthy group.
          </p>

          <section className="gov-policy">
            <h3>2. Approval by the board</h3>
            <ul className="gov-list">
              <li>The board will approve donors (and major donor advisors) giving (or recommending, in the case of advisors) above &pound;10,000 cumulatively in any 12-month period.</li>
              <li>
                The board will have access to all the KYD info above to decide whether to accept or reject the
                donation.
              </li>
            </ul>
          </section>

          <p className="gov-closing">
            The policies outlined above are not perfect, but they provide a strong defense against PauseAI UK ever
            becoming a vehicle for any outside interest.
          </p>

          <p className="gov-footnote">
            These policies may evolve over time. We will publish any changes to our policies before they are
            implemented.
          </p>

          <p className="gov-further">
            For a more detailed discussion of the reasoning behind these policies, see{" "}
            <a
              href="https://www.lesswrong.com/posts/e3Jz8P5KvTPcEiwdL/why-pauseai-uk-accepts-anonymous-donations"
              target="_blank"
              rel="noreferrer"
            >
              this blog post
            </a>{" "}
            by our Director.
          </p>

        </section>
      </div>
    </article>
  );
}
