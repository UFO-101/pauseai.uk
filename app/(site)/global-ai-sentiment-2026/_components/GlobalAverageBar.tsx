import { GLOBAL_AVERAGE, GLOBAL_MOE_PP, GLOBAL_N } from "@/lib/content/aiSentiment2026";
import VerticalDivergingBar from "./VerticalDivergingBar";
import styles from "./sentiment.module.css";

export default function GlobalAverageBar() {
  return (
    <VerticalDivergingBar
      row={GLOBAL_AVERAGE}
      meta={
        <>
          <span className={styles.term} data-tooltip="Number of people surveyed">
            n={GLOBAL_N.toLocaleString()}
          </span>
          {" · "}
          <span className={styles.term} data-tooltip="Margin of error at 95% confidence, in percentage points">
            &plusmn;{GLOBAL_MOE_PP}pp
          </span>
        </>
      }
    />
  );
}
