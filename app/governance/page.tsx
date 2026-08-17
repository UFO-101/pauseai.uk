import type { Metadata } from "next";
import Image from "next/image";
import Nav from "@/components/Nav";
import { board } from "@/lib/data/board";
import "../track-record/track-record.css";
import "./governance.css";

export const metadata: Metadata = {
  title: "Governance",
  description: "The board that oversees PauseAI UK, and the due diligence we carry out before accepting donations.",
  openGraph: {
    title: "PauseAI UK | Governance",
    description: "The board that oversees PauseAI UK, and the due diligence we carry out before accepting donations.",
    images: [{ url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 }],
    url: "https://pauseai.uk/governance/",
  },
  twitter: {
    images: ["/images/open-graph/open-graph-1600-840.jpg"],
  },
  alternates: { canonical: "/governance" },
};

export default function GovernancePage() {
  return (
    <>
      <Nav />
      <main className="track-record governance">
        <section className="tr-hero">
          <div className="container tr-hero-inner">
            <h1 className="tr-hero-title">Governance</h1>
          </div>
        </section>

        <section className="gov-board">
          <div className="container gov-inner">
            <h2>Our board</h2>
            <div className="board-grid">
              {board.map((member) => (
                <article key={member.name} className="board-card">
                  <Image className="board-photo" src={member.imageSrc} alt={member.name} width={320} height={320} />
                  <h3 className="board-name">{member.name}</h3>
                  <p className="board-role">{member.role}</p>
                  <div className="board-links">
                    <a
                      href={member.website}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${member.name} website`}
                      title="Website"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        <circle cx="12" cy="12" r="9.5" />
                        <ellipse cx="12" cy="12" rx="4.2" ry="9.5" />
                        <path d="M2.9 8.8h18.2M2.9 15.2h18.2" strokeLinecap="round" />
                      </svg>
                    </a>
                    <a
                      href={member.x}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${member.name} on X`}
                      title="X"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <article className="gov-article">
          <div className="container gov-inner">
            <section className="gov-section">
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
      </main>
    </>
  );
}
