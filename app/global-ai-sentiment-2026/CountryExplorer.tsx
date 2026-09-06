"use client";

import { useMemo, useState } from "react";
import { COUNTRIES, REGIONS, netOpinion, regionLabel } from "@/lib/data/aiSentiment2026";
import DivergingBar, { BarAxisLabels } from "./DivergingBar";
import Dropdown from "./Dropdown";

type SortMode = "opposed" | "favor" | "az";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "opposed", label: "Most opposed to rapid development" },
  { value: "favor", label: "Most in favour of rapid development" },
  { value: "az", label: "Country name (A–Z)" },
];

export default function CountryExplorer() {
  const [region, setRegion] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("opposed");
  const [showNotSure, setShowNotSure] = useState(true);

  const rows = useMemo(() => {
    let list = COUNTRIES;
    if (region !== "All") list = list.filter((c) => c.region === region);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.country.toLowerCase().includes(q));
    }
    const sorted = [...list];
    if (sort === "opposed") sorted.sort((a, b) => netOpinion(a) - netOpinion(b));
    if (sort === "favor") sorted.sort((a, b) => netOpinion(b) - netOpinion(a));
    if (sort === "az") sorted.sort((a, b) => a.country.localeCompare(b.country));
    return sorted;
  }, [region, search, sort]);

  return (
    <div className="gas-explorer">
      <div className="gas-explorer-controls">
        <Dropdown
          id="gas-region"
          label="Region"
          value={region}
          onChange={setRegion}
          options={[
            { value: "All", label: `All regions (${COUNTRIES.length})` },
            ...REGIONS.map((r) => ({
              value: r,
              label: `${regionLabel(r)} (${COUNTRIES.filter((c) => c.region === r).length})`,
            })),
          ]}
        />
        <Dropdown id="gas-sort" label="Sort by" value={sort} onChange={(v) => setSort(v as SortMode)} options={SORT_OPTIONS} />
        <div className="gas-filter-group gas-filter-search">
          <label htmlFor="gas-search">Search</label>
          <input
            id="gas-search"
            type="text"
            placeholder="Find a country…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="gas-filter-group gas-filter-checkbox">
          <label htmlFor="gas-show-not-sure">
            <input
              id="gas-show-not-sure"
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
        {rows.length === 0 && <p className="gas-empty">No countries match that search.</p>}
        {rows.map((row, i) => (
          <DivergingBar key={row.country} label={row.country} row={row} meta={<><span className="gas-term" data-tooltip="Number of people surveyed">n={row.n.toLocaleString()}</span>{" · "}<span className="gas-term" data-tooltip="Margin of error at 95% confidence, in percentage points">±{row.moe_pp}pp</span></>} rank={sort === "az" ? undefined : i + 1} showNotSure={showNotSure} />
        ))}
      </div>
    </div>
  );
}
