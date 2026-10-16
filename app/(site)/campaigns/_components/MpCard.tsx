import { copy } from "@/lib/content/email-your-mp";
import type { Mp } from "@/lib/email-your-mp";
import styles from "./EmailYourMp.module.css";

/** The sender's MP, as a card like the campaign's documents: who, where, then their email. */
export default function MpCard({ mp }: { mp: Mp }) {
  return (
    <div className={styles.mp}>
      <p className={styles.kind}>{copy.lookup.yourMp}</p>
      <h3>{mp.name}</h3>
      <p className={styles.constituency}>{copy.lookup.mpOf(mp.constituency)}</p>
      {/* data-mp-email: the visual diff masks it, as the test MP's inbox differs between hosts. */}
      <p data-mp-email>{mp.email ? <a href={`mailto:${mp.email}`}>{mp.email}</a> : copy.lookup.noEmail}</p>
    </div>
  );
}
