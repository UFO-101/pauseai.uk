import { ButtonLink } from "@/components/ui/Button";
import Section, { Lede, SectionHeader } from "@/components/ui/Section";
import { campaigns } from "@/lib/content/email-your-mp";
import { campaignPath } from "@/lib/email-your-mp";
import styles from "./DemisLetterHelp.module.css";

/**
 * How the letter came about, and who to ask about it. The letter is closed,
 * so the button goes to the campaign running now: the first in priority order.
 */
export default function DemisLetterHelp() {
  const [currentCampaign] = campaigns;
  return (
    <Section>
      <div className="container">
        <div className={styles.panel}>
          <SectionHeader title="How You Can Help">
            <Lede>
              PauseAI volunteers emailed their MPs asking them to sign this letter to Sir Demis Hassabis, calling for
              transparency in Google DeepMind&apos;s AI safety commitments.
            </Lede>
          </SectionHeader>
          <ButtonLink variant="primary" size="large" href={campaignPath(currentCampaign)} className={styles.button}>
            <span className={styles.buttonText}>
              Email your MP &rarr;
              <span className={styles.subtitle}>{currentCampaign.title}</span>
            </span>
          </ButtonLink>
        </div>
        <p className={styles.contact}>
          For enquiries contact <a href="mailto:joseph@pauseai.info">Joseph Miller at joseph@pauseai.info</a>
        </p>
      </div>
    </Section>
  );
}
