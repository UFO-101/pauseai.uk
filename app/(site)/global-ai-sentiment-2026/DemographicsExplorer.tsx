"use client";

import { useMemo, useState } from "react";
import { DEMOGRAPHICS, regionLabel } from "@/lib/data/aiSentiment2026";
import DivergingBar, { BarAxisLabels } from "./DivergingBar";

const SECTIONS: { key: string; label: string }[] = [
  { key: "region_average", label: "Region" },
  { key: "age", label: "Age" },
  { key: "gender", label: "Gender" },
  { key: "education", label: "Education" },
  { key: "income", label: "Income" },
  { key: "employment", label: "Employment" },
  { key: "location", label: "Location" },
  { key: "uk_us", label: "UK vs US" },
  { key: "uk_us_gender", label: "UK & US by gender" },
];

export default function DemographicsExplorer() {
  const [section, setSection] = useState(SECTIONS[0].key);
  const [showNotSure, setShowNotSure] = useState(true);

  const rows = useMemo(() => DEMOGRAPHICS.filter((d) => d.section === section), [section]);

  return (
    <div className="gas-explorer">
      <div className="gas-tabs" role="tablist" aria-label="Demographic cut">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={section === s.key}
            className={`gas-tab ${section === s.key ? "active" : ""}`}
            onClick={() => setSection(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="gas-explorer-controls">
        <div className="gas-filter-group gas-filter-checkbox">
          <label htmlFor="gas-demo-show-not-sure">
            <input
              id="gas-demo-show-not-sure"
              type="checkbox"
              checked={showNotSure}
              onChange={(e) => setShowNotSure(e.target.checked)}
            />
            Show &ldquo;not sure&rdquo;
          </label>
        </div>
      </div>

      <div className="gas-bar-list">
        <BarAxisLabels />
        {rows.map((row) => (
          <DivergingBar key={row.group} label={section === "region_average" ? regionLabel(row.group) : row.group} row={row} showNotSure={showNotSure} />
        ))}
      </div>
    </div>
  );
}
