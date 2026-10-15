import { pageMetadata } from "@/lib/metadata";
import Signatories from "../../campaigns/_components/Signatories";
import CampaignContext from "../_components/CampaignContext";
import CampaignDocs, { DocCard } from "../_components/CampaignDocs";
import CampaignHero from "../_components/CampaignHero";
import EmailYourMpSection from "../_components/EmailYourMpSection";

// The letter to the PM, in the words of today's /campaigns, which it
// replaces (plans/email-your-mp-v2.md). Unlisted, and kept out of search.
export const metadata = {
  ...pageMetadata({
    title: "Regulate AI developers now",
    description: "Take action on AI safety. Email your MP, join campaigns, and help build pressure for a global pause.",
    path: "/campaigns-v2/regulate-letter-pm",
  }),
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <main className="campaigns">
      <CampaignHero title="Regulate AI developers now" campaignSlug="regulate-letter-pm" />

      <CampaignContext>
        <p>AI poses extremely serious risks to our national security.</p>
        <p>
          In a series of incidents this summer, a &ldquo;swarm&rdquo; of OpenAI agents created secret messaging channels
          and hacked into the infrastructure of another AI company, and OpenAI itself, without OpenAI being aware. These
          attacks would have constituted criminal offences if they had been performed by humans. Yet no one has been
          held accountable to date.
        </p>
        <p>
          Today, the UK has no specific legal standards for frontier AI safety. No regulator oversees frontier AI
          development, and UK law does not reliably hold developers liable for damage or deaths caused by their models,
          even when the danger is predictable, preventable, and uniquely enabled by AI.
        </p>
        <p>
          Given the pace at which AI capabilities are advancing, this matter cannot wait. We urge the Prime Minister to
          introduce legislation to address the risks of frontier AI development.
        </p>
      </CampaignContext>

      <CampaignDocs>
        <DocCard
          file="Frontier-AI-Open-Letter.pdf"
          kind="Open letter — June 2026"
          title="To the Prime Minister"
          cta="Read the letter →"
        />
        <DocCard
          file="Frontier-AI-Risks-Policy-Briefing.pdf"
          kind="Policy briefing — June 2026"
          title="Frontier AI Risks"
          cta="Read the briefing →"
        />
      </CampaignDocs>

      <EmailYourMpSection
        campaignSlug="regulate-letter-pm"
        // Outside production, letters only go to the test MPs, so say how to find them.
        showTestMps={process.env.DEPLOY_CONTEXT !== "production"}
      />

      <Signatories />
    </main>
  );
}
