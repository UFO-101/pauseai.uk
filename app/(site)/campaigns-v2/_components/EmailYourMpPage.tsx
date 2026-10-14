import type { Campaign } from "@/lib/content/email-your-mp";
import EmailYourMpTool from "./EmailYourMpTool";
import styles from "./EmailYourMp.module.css";

/** One campaign's page, around the tool. */
export default function EmailYourMpPage({ campaign, turnstileSiteKey, showTestMps }: { campaign: Campaign; turnstileSiteKey?: string; showTestMps?: boolean }) {
  return (
    <main>
      <section className={`container ${styles.page}`}>
        <h1>{campaign.title}</h1>
        <p>{campaign.description}</p>
        <EmailYourMpTool campaignSlug={campaign.slug} turnstileSiteKey={turnstileSiteKey} showTestMps={showTestMps} />
      </section>
    </main>
  );
}
