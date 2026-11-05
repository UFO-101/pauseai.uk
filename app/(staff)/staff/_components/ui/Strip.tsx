import type { ReactNode } from "react";
import AlertIcon from "../AlertIcon";
import styles from "./Strip.module.css";

export type StripTone = "plain" | "green" | "amber" | "red" | "blue" | "dark";

/**
 * A strip: the staff pages' way of saying how something stands, never a
 * box (docs/style-guide.md, "Staff pages"). Tinted in its tone, with no
 * border; amber, red and blue have their icon at the left. Inside a card, it's
 * that thing's state; on the page, full width, something needing a
 * person. `action` sits at the right, a button or a link. `announce` reads
 * it out at once: red as an alert, any other as a status. `icon={false}`
 * leaves out the icon, for a red or amber that's an answer, not a warning.
 * Blue is something going on now.
 * Dark is a mode the page is in, such as choosing who a mailing is for:
 * the dark bar's look (PoliticiansList's ChoosingBar), its links light.
 */
export default function Strip({
  tone = "plain",
  action,
  announce = false,
  icon = true,
  children,
}: {
  tone?: StripTone;
  action?: ReactNode;
  announce?: boolean;
  icon?: boolean;
  children: ReactNode;
}) {
  const role = announce ? (tone === "red" ? "alert" : "status") : undefined;
  return (
    <div className={tone === "plain" ? styles.strip : `${styles.strip} ${styles[tone]}`} role={role}>
      {icon && (tone === "amber" || tone === "red" || tone === "blue") && <AlertIcon tone={tone} />}
      <div className={styles.body}>{children}</div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
