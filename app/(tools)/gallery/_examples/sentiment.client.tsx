"use client";

// The sentiment report's examples that need state: client components with no
// props, so the server-rendered gallery can place them.
import Dropdown from "@/app/(site)/global-ai-sentiment-2026/_components/Dropdown";
import { REGIONS, regionLabel } from "@/lib/content/aiSentiment2026";
import { Controlled } from "../_components/wiring";

const OPTIONS = [{ value: "all", label: "All regions" }, ...REGIONS.map((r) => ({ value: r, label: regionLabel(r) }))];

/** The report's dropdown, picking a region; the pick shows beside it. */
export function DropdownExample() {
  return (
    <Controlled initial="all">
      {(value, set) => <Dropdown id="gallery-region" label="Region" value={value} options={OPTIONS} onChange={set} />}
    </Controlled>
  );
}
