"use client";

import { useState } from "react";
import type { CalendarEvent } from "@/lib/collateral/eventText";
import CollateralStudio from "./CollateralStudio";
import GalleryStudio from "./GalleryStudio";
import PackStudio from "./PackStudio";

type Mode = "single" | "pack" | "gallery";

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "single", label: "Single image", hint: "One design, one format." },
  { id: "pack", label: "Campaign pack", hint: "One design, every format an event needs." },
  { id: "gallery", label: "Gallery / carousel", hint: "Photo slides for a carousel post." },
];

export default function CollateralApp({ events }: { events: CalendarEvent[] }) {
  const [mode, setMode] = useState<Mode>("single");

  return (
    <div>
      <div className="collateral-mode-switch" role="radiogroup" aria-label="Post type">
        {MODES.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} title={m.hint} onClick={() => setMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>
      <p className="collateral-mode-hint">{MODES.find((m) => m.id === mode)?.hint}</p>
      {mode === "single" && <CollateralStudio events={events} />}
      {mode === "pack" && <PackStudio events={events} />}
      {mode === "gallery" && <GalleryStudio />}
    </div>
  );
}
