import { pageMetadata } from "@/lib/metadata";
import CampaignContext from "../_components/CampaignContext";
import CampaignHero from "../_components/CampaignHero";
import EmailYourMpSection from "../_components/EmailYourMpSection";

// Support Alex Sobel's bill. Its words, documents and supporters are to come
// (plans/email-your-mp-v2.md, "Tasks for Francis"). Unlisted, and kept out
// of search.
export const metadata = {
  ...pageMetadata({
    title: "⁂ Lex Alexandri Sobel",
    description: "⁂ Duis aute irure dolor in reprehenderit in voluptate velit esse.",
    path: "/campaigns-v2/support-sobel-bill",
  }),
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <main className="campaigns">
      <CampaignHero title="⁂ Lex Alexandri Sobel" />

      <CampaignContext>
        <p>⁂ Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
        <p>⁂ Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
      </CampaignContext>

      <EmailYourMpSection
        campaignSlug="support-sobel-bill"
        turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        // Outside production, letters only go to the test MPs, so say how to find them.
        showTestMps={process.env.DEPLOY_CONTEXT !== "production"}
      />
    </main>
  );
}
