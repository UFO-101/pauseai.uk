import { pageMetadata } from "@/lib/metadata";
import CampaignContext from "../_components/CampaignContext";
import CampaignHero from "../_components/CampaignHero";
import EmailYourMpSection from "../_components/EmailYourMpSection";

// Support Alex Sobel's bill. Its documents and supporters are to come
// (plans/email-your-mp-v2.md, "Tasks for Francis"). Unlisted, and kept out
// of search.
export const metadata = {
  ...pageMetadata({
    title: "Support the Artificial Superintelligence Bill",
    description: "Take action on AI safety. Email your MP, join campaigns, and help build pressure for a global pause.",
    path: "/campaigns-v2/support-sobel-bill",
  }),
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <main className="campaigns">
      <CampaignHero title="Support the Artificial Superintelligence Bill" campaignSlug="support-sobel-bill" />

      <CampaignContext>
        <p>
          In June, AI company Anthropic{" "}
          <a href="https://www.anthropic.com/institute/recursive-self-improvement">revealed</a> that AI writes 80% of
          its software, and it can carry out experiments by itself. This is the first step to &ldquo;recursive
          self-improvement&rdquo; where an AI rapidly and dangerously makes itself more powerful.
        </p>
        <p>
          Jacob Coxon, a researcher at Anthropic who resigned in protest in September, said that AI companies are
          &ldquo;racing straight to self-improving superintelligence and gambling with our lives&rdquo;.
        </p>
        <p>
          Today, there is no international treaty to prevent uncontrolled superintelligent AI. Unlike the nuclear
          industry, there is no monitoring of AI chips to ensure they are not used in this dangerous way.
        </p>
        <p>
          Alex Sobel MP has tabled the Artificial Superintelligence Bill to address this. We urge MPs and Lords to
          support this bill, and lead the world in building what is needed for an international treaty.
        </p>
      </CampaignContext>

      <EmailYourMpSection
        campaignSlug="support-sobel-bill"
        // Outside production, letters only go to the test MPs, so say how to find them.
        showTestMps={process.env.DEPLOY_CONTEXT !== "production"}
      />
    </main>
  );
}
