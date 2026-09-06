"use client";

import { useState } from "react";
import { GLOBAL_AVERAGE, GLOBAL_MOE_PP, GLOBAL_N } from "@/lib/data/aiSentiment2026";
import DivergingBar, { BarAxisLabels } from "./DivergingBar";

export default function GlobalAverageBar() {
  const [showNotSure, setShowNotSure] = useState(true);

  return (
    <div className="gas-explorer">
      <div className="gas-explorer-controls">
        <div className="gas-filter-group gas-filter-checkbox">
          <label htmlFor="gas-global-show-not-sure">
            <input
              id="gas-global-show-not-sure"
              type="checkbox"
              checked={showNotSure}
              onChange={(e) => setShowNotSure(e.target.checked)}
            />
            Show &ldquo;not sure&rdquo;
          </label>
        </div>
      </div>

      <div className="gas-bar-list gas-global-bar">
        <BarAxisLabels />
        <DivergingBar
          label="Global average"
          row={GLOBAL_AVERAGE}
          showNotSure={showNotSure}
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
      </div>
    </div>
  );
}
