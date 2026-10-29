import { staffCopy } from "@/lib/content/staff-interface";
import styles from "./ImportIcon.module.css";

/** Where an import reads from, or that it only checks. */
export type ImportSource = "airtable" | "luma" | "gmail" | "web" | "checkOnly";

// Airtable's and Gmail's marks are Simple Icons' (https://simpleicons.org,
// CC0). It has none of Luma's, so Luma is a calendar, as in the site's
// footer. The web is a globe, and a check a magnifier with a tick in it.
const MARKS: Record<ImportSource, { fill: boolean; d: string[] }> = {
  airtable: {
    fill: true,
    d: [
      "M11.992 1.966c-.434 0-.87.086-1.28.257L1.779 5.917c-.503.208-.49.908.012 1.116l8.982 3.558a3.266 3.266 0 0 0 2.454 0l8.982-3.558c.503-.196.503-.908.012-1.116l-8.957-3.694a3.255 3.255 0 0 0-1.272-.257zM23.4 8.056a.589.589 0 0 0-.222.045l-10.012 3.877a.612.612 0 0 0-.38.564v8.896a.6.6 0 0 0 .821.552L23.62 18.1a.583.583 0 0 0 .38-.551V8.653a.6.6 0 0 0-.6-.596zM.676 8.095a.644.644 0 0 0-.48.19C.086 8.396 0 8.53 0 8.69v8.355c0 .442.515.737.908.54l6.27-3.006.307-.147 2.969-1.436c.466-.22.43-.908-.061-1.092L.883 8.138a.57.57 0 0 0-.207-.044z",
    ],
  },
  gmail: {
    fill: true,
    d: [
      "M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z",
    ],
  },
  luma: {
    fill: false,
    d: ["M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z", "M3 10h18M8 3v4M16 3v4"],
  },
  web: {
    fill: false,
    d: [
      "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
      "M3 12h18",
      "M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z",
    ],
  },
  checkOnly: {
    fill: false,
    d: ["M10.5 3.5a7 7 0 1 0 0 14 7 7 0 0 0 0-14z", "M15.5 15.5L21 21", "M7.5 10.5l2 2 3.5-3.5"],
  },
};

/** Where an import reads from, or that it only checks, as a small icon on a tile, named for screen readers and on hover. */
export default function ImportIcon({ source }: { source: ImportSource }) {
  const { fill, d } = MARKS[source];
  const label = staffCopy.import[source];
  return (
    <span className={styles.tile} title={label}>
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        role="img"
        aria-label={label}
        {...(fill
          ? { fill: "currentColor" }
          : { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" })}
      >
        {d.map((path) => (
          <path key={path} d={path} />
        ))}
      </svg>
    </span>
  );
}

/** A job's icons, side by side. */
export function ImportIcons({ sources }: { sources: ImportSource[] }) {
  return (
    <span className={styles.icons}>
      {sources.map((source) => (
        <ImportIcon key={source} source={source} />
      ))}
    </span>
  );
}
