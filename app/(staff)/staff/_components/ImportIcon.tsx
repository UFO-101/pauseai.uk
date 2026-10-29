import Image from "next/image";
import type { ReactNode } from "react";
import { staffCopy } from "@/lib/content/staff-interface";
import styles from "./ImportIcon.module.css";

/** Where an import reads from. */
export type ImportSource = "airtable" | "luma" | "gmail" | "web";

// Each service's own mark, in its own colours: Airtable's three boxes (its
// shape Simple Icons', https://simpleicons.org, CC0), Gmail's M, and Luma's
// star, its own picture from luma.com, as it's shaded rather than flat.
// The web, no one's, is a globe.
const MARKS: Record<ImportSource, ReactNode> = {
  airtable: (
    <svg viewBox="0 0 24 24">
      <path
        fill="var(--brand-airtable-yellow)"
        d="M11.992 1.966c-.434 0-.87.086-1.28.257L1.779 5.917c-.503.208-.49.908.012 1.116l8.982 3.558a3.266 3.266 0 0 0 2.454 0l8.982-3.558c.503-.196.503-.908.012-1.116l-8.957-3.694a3.255 3.255 0 0 0-1.272-.257z"
      />
      <path
        fill="var(--brand-airtable-blue)"
        d="M23.4 8.056a.589.589 0 0 0-.222.045l-10.012 3.877a.612.612 0 0 0-.38.564v8.896a.6.6 0 0 0 .821.552L23.62 18.1a.583.583 0 0 0 .38-.551V8.653a.6.6 0 0 0-.6-.596z"
      />
      <path
        fill="var(--brand-airtable-red)"
        d="M.676 8.095a.644.644 0 0 0-.48.19C.086 8.396 0 8.53 0 8.69v8.355c0 .442.515.737.908.54l6.27-3.006.307-.147 2.969-1.436c.466-.22.43-.908-.061-1.092L.883 8.138a.57.57 0 0 0-.207-.044z"
      />
    </svg>
  ),
  gmail: (
    <svg viewBox="52 42 88 66">
      <path fill="var(--brand-gmail-blue)" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6" />
      <path fill="var(--brand-gmail-green)" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15" />
      <path fill="var(--brand-gmail-yellow)" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2" />
      <path fill="var(--brand-gmail-red)" d="M72 74V48l24 18 24-18v26L96 92" />
      <path fill="var(--brand-gmail-dark-red)" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2" />
    </svg>
  ),
  luma: <Image src="/images/logos/luma.png" alt="" width={36} height={36} />,
  web: (
    <svg viewBox="0 0 24 24" className={styles.line}>
      <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
    </svg>
  ),
};

/** Where an import reads from, as its mark on a tile, named for screen readers and on hover. */
export default function ImportIcon({ source }: { source: ImportSource }) {
  const label = staffCopy.import[source];
  return (
    <span className={styles.tile} title={label} role="img" aria-label={label}>
      <span className={styles.mark} aria-hidden="true">
        {MARKS[source]}
      </span>
    </span>
  );
}
