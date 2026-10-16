import { DocCard } from "../../_components/CampaignDocs";
import styles from "./dear-sir-demis.module.css";

/** The background information behind the letter, as a PDF. */
export default function DemisLetterBackground() {
  return (
    <section className={styles.background}>
      <div className={`container ${styles.backgroundInner}`}>
        <div>
          <h2 className={styles.sectionTitle}>Learn More</h2>
          <p className={styles.sectionLede}>
            More detail about Google DeepMind&apos;s violation can be found in our background information document.
          </p>
        </div>
        <div className={styles.backgroundDoc}>
          <DocCard file="PauseAI-Open-Letter-Background-Information.pdf" title="Background Information" />
        </div>
      </div>
    </section>
  );
}
