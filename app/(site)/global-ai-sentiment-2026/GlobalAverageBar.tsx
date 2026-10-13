import { GLOBAL_AVERAGE, GLOBAL_MOE_PP, GLOBAL_N } from "@/lib/data/aiSentiment2026";
import VerticalDivergingBar from "./VerticalDivergingBar";

export default function GlobalAverageBar() {
  return (
    <VerticalDivergingBar
      row={GLOBAL_AVERAGE}
      meta={
        <>
          <span className="gas-term" data-tooltip="Number of people surveyed">
            n={GLOBAL_N.toLocaleString()}
          </span>
          {" · "}
          <span className="gas-term" data-tooltip="Margin of error at 95% confidence, in percentage points">
            &plusmn;{GLOBAL_MOE_PP}pp
          </span>
        </>
      }
    />
  );
}
