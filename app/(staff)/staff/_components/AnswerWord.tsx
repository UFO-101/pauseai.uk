import { AGREED_STATUSES, type AskStatus } from "@/lib/asks";
import { staffCopy } from "@/lib/content/staff-interface";
import styles from "./AnswerWord.module.css";

const DECLINED: readonly AskStatus[] = ["declined", "declined_surgery"];

/** Someone's answer to an ask, or null for none, in words: a yes ticked in green, a no crossed, the rest plain. */
export default function AnswerWord({ status }: { status: AskStatus | null }) {
  const mark =
    status && (AGREED_STATUSES.includes(status) ? styles.yes : DECLINED.includes(status) ? styles.no : undefined);
  return <span className={mark ?? undefined}>{staffCopy.statuses[status ?? "noAnswer"]}</span>;
}
