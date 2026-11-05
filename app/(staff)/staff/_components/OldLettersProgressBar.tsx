import { staffCopy } from "@/lib/content/staff-interface";
import type { OldLettersProgress } from "@/lib/import-runs";
import CountsByMailing from "./CountsByMailing";
import Progress from "./ui/Progress";
import styles from "./OldLettersProgressBar.module.css";

const words = staffCopy.oldLetters;
const number = (n: number) => n.toLocaleString("en-GB");

/** How far the import of old letters has got, over all its runs: nothing until it has listed something. */
export default function OldLettersProgressBar({ progress }: { progress: OldLettersProgress }) {
  const { read, left, joined, replies, autoReplies, oneOffs, refusals, byMailing, titles } = progress;
  if (read + left === 0) return null;
  return (
    <div className={styles.progress}>
      <Progress value={read} max={read + left} tone="blue" label={words.progress.label} big>
        {words.progress.counts(number(read), number(left))}
      </Progress>
      <details>
        <summary>
          {words.progress.totals({
            joined: number(joined),
            replies: number(replies),
            autoReplies: number(autoReplies),
            oneOffs: number(oneOffs),
          })}
          {refusals > 0 && <> {words.progress.refusals(refusals)}</>}
        </summary>
        <CountsByMailing heading={words.joined} counts={byMailing} titles={titles} />
      </details>
    </div>
  );
}
