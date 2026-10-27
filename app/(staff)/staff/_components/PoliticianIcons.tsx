import type { Country } from "@/lib/server/politicians";
import { NATION_SHAPES } from "@/lib/nation-shapes";
import { partyColour } from "@/lib/party-colours";
import styles from "./PoliticianIcons.module.css";

const PETALS = Array.from({ length: 12 }, (_, i) => (i * Math.PI) / 6);

/** A rosette in the party's colour: a ring of petals round a disc, with two ribbons. */
export function Rosette({ party }: { party: string }) {
  const colour = partyColour(party);
  return (
    <svg viewBox="0 0 32 40" width="28" height="35" aria-hidden="true" className={styles.icon}>
      <path d="M11 22 L7 38 L12 35 L15 39 L16 24 Z" fill={colour} />
      <path d="M21 22 L25 38 L20 35 L17 39 L16 24 Z" fill={colour} opacity={0.85} />
      {PETALS.map((a) => (
        <circle key={a} cx={16 + 9 * Math.cos(a)} cy={14 + 9 * Math.sin(a)} r={4.2} fill={colour} opacity={0.75} />
      ))}
      <circle cx="16" cy="14" r="7" fill={colour} />
      <circle cx="16" cy="14" r="4" fill="white" opacity={0.9} />
    </svg>
  );
}

/** A dot: green, ringed, for in office; grey for not. */
export function StatusDot({ inOffice }: { inOffice: boolean }) {
  return <span className={inOffice ? `${styles.dot} ${styles.in}` : styles.dot} aria-hidden="true" />;
}

/** The nation's outline, in the text colour. */
export function NationShape({ country }: { country: Country }) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" className={styles.icon}>
      <path d={NATION_SHAPES[country]} fill="currentColor" />
    </svg>
  );
}
