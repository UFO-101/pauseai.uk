import Section, { Lede, SectionHeader } from "@/components/ui/Section";
import { DocCard } from "../../_components/CampaignDocs";
import styles from "./DemisLetterBackground.module.css";

/** The background information behind the letter, as a PDF. */
export default function DemisLetterBackground() {
  return (
    <Section tone="muted">
      <div className={`container ${styles.inner}`}>
        <SectionHeader title="Learn More">
          <Lede>
            More detail about Google DeepMind&apos;s violation can be found in our background information document.
          </Lede>
        </SectionHeader>
        <div className={styles.doc}>
          <DocCard file="PauseAI-Open-Letter-Background-Information.pdf" title="Background Information" />
        </div>
      </div>
    </Section>
  );
}
