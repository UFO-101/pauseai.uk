import type { Campaign } from "@/lib/content/email-your-mp";
import { copy } from "@/lib/content/email-your-mp";
import EmailYourMpTool from "./EmailYourMpTool";
import styles from "./EmailYourMp.module.css";

/** The page around the tool, for one campaign or for whichever the MP hasn't done. */
export default function EmailYourMpPage({ campaign, turnstileSiteKey }: { campaign?: Campaign; turnstileSiteKey?: string }) {
  return (
    <main>
      <section className={`container ${styles.page}`}>
        <h1>{campaign?.title ?? copy.pageTitle}</h1>
        <p>{campaign?.description ?? copy.pageDescription}</p>
        <EmailYourMpTool campaignSlug={campaign?.slug} turnstileSiteKey={turnstileSiteKey} />
      </section>
    </main>
  );
}
