import type { ReactNode } from "react";
import { staffCopy } from "@/lib/content/staff-interface";
import styles from "./ExternalLink.module.css";

/**
 * A link out of the site, from a staff page: it opens in a new tab and sends
 * no referrer, with an arrow after its words that says it leaves. A tooltip
 * says so too, which a screen reader reads as its description.
 */
export default function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={styles.link} title={staffCopy.opensInNewTab}>
      {children}
    </a>
  );
}
