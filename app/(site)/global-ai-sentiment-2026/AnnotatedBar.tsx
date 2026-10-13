"use client";

import { useEffect, useRef, useState } from "react";
import { RESPONSE_OPTIONS, type DemographicRow } from "@/lib/data/aiSentiment2026";

type DeclutterTarget = { key: string; targetX: number };
type Placed<T extends DeclutterTarget> = T & { boxX: number };

// Spreads callout boxes out along the x-axis so they never overlap, even
// when the real things they point at (e.g. two adjacent bar segments, or
// "n" and "±pp" sitting right next to each other in the same line of text)
// are close together. Boxes keep their relative spacing to each other
// (a forward pass pushes overlapping boxes right of their left neighbour),
// then the whole cluster is shifted so it's centred on centerX rather than
// left-anchored on the leftmost target — otherwise all the "extra" width
// needed to fit the boxes ends up added to the right, skewing the group.
// The connector arrow bridges whatever gap is left between a box and its
// real target.
function declutter<T extends DeclutterTarget>(targets: T[], boxWidth: number, gap: number, centerX: number): Placed<T>[] {
  const sorted = [...targets].sort((a, b) => a.targetX - b.targetX);
  const n = sorted.length;
  if (n === 0) return [];
  const x = sorted.map((t) => t.targetX);
  for (let i = 1; i < n; i++) x[i] = Math.max(x[i], x[i - 1] + boxWidth + gap);
  const clusterMid = (x[0] + x[n - 1]) / 2;
  const shift = centerX - clusterMid;
  for (let i = 0; i < n; i++) x[i] += shift;
  return sorted.map((t, i) => ({ ...t, boxX: x[i] }));
}

// A smooth S-shaped connector between a box and the thing it points at:
// both control points sit at the vertical midpoint, so the curve eases
// out of the box and into the target rather than bending sharply.
function sCurve(x1: number, y1: number, x2: number, y2: number): string {
  const midY = (y1 + y2) / 2;
  return `M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`;
}

function ArrowMarker({ id }: { id: string }) {
  return (
    <defs>
      <marker id={id} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill="var(--border-strong)" />
      </marker>
    </defs>
  );
}

const HEADER_BOX_WIDTH = 122;
const HEADER_BOX_GAP = 8;
const HEADER_BOX_BOTTOM = 78;
const HEADER_HEIGHT = 170;

// A one-off explainer diagram for the global-average row: callout boxes
// above the bar, each pointing down at the segment it describes via a
// curved arrow. Renders as an extra row inside the same .gas-bar-list grid
// as DivergingBar (via display: contents), and measures the track's own
// width client-side so the decluttered boxes and the bar segments they
// annotate share one coordinate space.
export function AnnotatedBarHeader({ row }: { row: DemographicRow }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  let cumulative = 0;
  const targets = RESPONSE_OPTIONS.map((option) => {
    const value = row[option.key];
    const centerPct = cumulative + value / 2;
    cumulative += value;
    return { key: option.key, targetX: (centerPct / 100) * width, option, value };
  });
  const placed = width ? declutter(targets, HEADER_BOX_WIDTH, HEADER_BOX_GAP, width / 2) : [];

  return (
    <div className="gas-annotated-row">
      <span aria-hidden="true" />
      <div className="gas-annotated" ref={containerRef}>
        {placed.length > 0 && (
          <svg className="gas-annotated-svg" aria-hidden="true">
            <ArrowMarker id="gas-annotated-arrow-down" />
            {placed.map((p) => (
              <path key={p.key} d={sCurve(p.boxX, HEADER_BOX_BOTTOM, p.targetX, HEADER_HEIGHT)} className="gas-annotated-connector" markerEnd="url(#gas-annotated-arrow-down)" />
            ))}
          </svg>
        )}
        {placed.map((p) => (
          <div key={p.key} className="gas-annotated-callout" style={{ left: p.boxX }}>
            <div className="gas-annotated-box" style={{ width: HEADER_BOX_WIDTH }}>
              <span className="gas-annotated-box-head">
                <span className="gas-annotated-dot" style={{ background: p.option.light }} />
                <span className="gas-annotated-label">{p.option.label}</span>
              </span>
              <span className="gas-annotated-value">{p.value}%</span>
            </div>
          </div>
        ))}
      </div>
      <span aria-hidden="true" />
    </div>
  );
}

const FOOTER_PAIR_TARGETS = [
  { id: "gas-demo-n", key: "n", label: "n", desc: "Number of people surveyed for that row." },
  { id: "gas-demo-moe", key: "moe", label: "±pp", desc: "Margin of error at 95% confidence." },
] as const;

const FOOTER_BOX_WIDTH = 118;
const FOOTER_BOX_GAP = 14;
const FOOTER_BOX_TOP = 46;

type FooterKey = "n" | "moe";
type FooterPlaced = { key: FooterKey; boxX: number; boxWidth: number; targetX: number; label: string; desc: string };

// A second explainer row below the bar: separate callouts for n and the
// margin of error, each pointing up at the exact element it describes
// with a curved arrow. Target positions are measured from the real DOM
// (the label text they point at doesn't sit at fixed offsets). The pair
// is decluttered and centred on its combined midpoint, so both arrows
// curve inward symmetrically.
export function AnnotatedBarFooter({ wrapId }: { wrapId: string }) {
  const [placed, setPlaced] = useState<FooterPlaced[] | null>(null);

  useEffect(() => {
    function measure() {
      const wrap = document.getElementById(wrapId);
      if (!wrap) return;
      const wrapRect = wrap.getBoundingClientRect();
      const targetX = (id: string) => {
        const el = document.getElementById(id);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return rect.left + rect.width / 2 - wrapRect.left;
      };

      const pairTargets = FOOTER_PAIR_TARGETS.map((t) => {
        const x = targetX(t.id);
        return x === null ? null : { key: t.key, targetX: x };
      }).filter((p): p is { key: (typeof FOOTER_PAIR_TARGETS)[number]["key"]; targetX: number } => p !== null);

      const pairCenter = pairTargets.length ? (Math.min(...pairTargets.map((p) => p.targetX)) + Math.max(...pairTargets.map((p) => p.targetX))) / 2 : 0;
      const pairPlaced = declutter(pairTargets, FOOTER_BOX_WIDTH, FOOTER_BOX_GAP, pairCenter);

      const next: FooterPlaced[] = pairPlaced.map((p) => {
        const meta = FOOTER_PAIR_TARGETS.find((t) => t.key === p.key)!;
        return { key: p.key, boxX: p.boxX, boxWidth: FOOTER_BOX_WIDTH, targetX: p.targetX, label: meta.label, desc: meta.desc };
      });
      setPlaced(next);
    }
    measure();
    // Re-measure once web fonts finish loading, since the demo text (and
    // so the target positions) can shift width when the fallback font swaps.
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [wrapId]);

  if (!placed) return <div className="gas-annotated-below-wrap" aria-hidden="true" />;

  return (
    <div className="gas-annotated-below-wrap">
      <svg className="gas-annotated-svg" aria-hidden="true">
        <ArrowMarker id="gas-annotated-arrow-up" />
        {placed.map((p) => (
          <path key={p.key} d={sCurve(p.boxX, FOOTER_BOX_TOP, p.targetX, 0)} className="gas-annotated-connector" markerEnd="url(#gas-annotated-arrow-up)" />
        ))}
      </svg>
      {placed.map((p) => (
        <div key={p.key} className="gas-annotated-callout-below" style={{ left: p.boxX, width: p.boxWidth }}>
          <div className="gas-annotated-box">
            <span className="gas-annotated-label">{p.label}</span>
            <span className="gas-annotated-desc">{p.desc}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
