import { ButtonLink } from "@/components/ui/Button";
import { campaigns } from "@/lib/content/email-your-mp";
import { campaignPath } from "@/lib/email-your-mp";
import styles from "./dear-sir-demis.module.css";

/**
 * How the letter came about, and who to ask about it. The letter is closed,
 * so the button goes to the campaign running now: the first in priority order.
 */
export default function DemisLetterHelp() {
  const [currentCampaign] = campaigns;
  return (
    <section className={styles.help}>
      <div className="container">
        <div className={styles.helpPanel}>
          <h2 className={styles.sectionTitle}>How You Can Help</h2>
          <p className={styles.sectionLede}>
            PauseAI volunteers emailed their MPs asking them to sign this letter to Sir Demis Hassabis, calling for
            transparency in Google DeepMind&apos;s AI safety commitments.
          </p>
          <ButtonLink variant="primary" size="large" href={campaignPath(currentCampaign)} className={styles.helpButton}>
            Email your MP &rarr;
            <span className={styles.helpButtonSubtitle}>{currentCampaign.title}</span>
          </ButtonLink>
        </div>
        <p className={styles.contact}>
          For enquiries contact <a href="mailto:joseph@pauseai.info">Joseph Miller at joseph@pauseai.info</a>
        </p>
      </div>
    </section>
  );
}
