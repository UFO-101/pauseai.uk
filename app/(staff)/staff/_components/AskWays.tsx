import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { AskWay } from "@/lib/server/asks";
import StaffLink from "./ui/StaffLink";
import styles from "./AskWays.module.css";

/**
 * The campaigns and mailings that put an ask, each kind under its own heading,
 * and in a tight column of its own, so they line up from one ask to the next. `wide`, for the whole of a page: the kinds side by
 * side, with how many letters each sent at the end of its line.
 */
export default function AskWays({ ways, wide = false }: { ways: AskWay[]; wide?: boolean }) {
  return (
    <div className={wide ? `${styles.ways} ${styles.wide}` : styles.ways}>
      {(["campaign", "mailing"] as const).map((kind) => {
        const theirs = ways.filter((way) => way.kind === kind);
        return (
          theirs.length > 0 && (
            <div key={kind} className={styles[kind]}>
              <p className={styles.heading}>{staffCopy.asks.waysOf[kind]}</p>
              <ul>
                {theirs.map((way) => (
                  <li key={way.href}>
                    <StaffLink href={way.href}>{way.title}</StaffLink>
                    {wide && <Muted>{staffCopy.asks.page.letters(way.letters)}</Muted>}
                  </li>
                ))}
              </ul>
            </div>
          )
        );
      })}
    </div>
  );
}
