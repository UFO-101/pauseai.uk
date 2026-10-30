import { constituencyMapCopy as copy } from "@/lib/content/constituency-map";
import styles from "./DraftNotice.module.css";

/** A band across the top of the page saying it's a draft, for testing. */
export default function DraftNotice() {
  return (
    <p className={styles.notice} role="note">
      {copy.draftNotice}
    </p>
  );
}
