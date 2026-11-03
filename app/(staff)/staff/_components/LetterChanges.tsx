"use client";

import { useState, type ReactNode } from "react";
import { staffCopy } from "@/lib/content/staff-interface";
import { changeBlocks, type Change } from "@/lib/letter-changes";
import ThreadEmail from "./ThreadEmail";
import styles from "./LetterChanges.module.css";

const copy = staffCopy.letterChanges;

/** A run of changes, what was added marked and what was cut struck through. */
function Changes({ changes }: { changes: Change[] }) {
  return (
    <div className={styles.changed}>
      {changes.map((change, i) =>
        change.kind === "added" ? (
          <ins key={i}>{change.text}</ins>
        ) : change.kind === "removed" ? (
          <del key={i}>{change.text}</del>
        ) : (
          <span key={i}>{change.text}</span>
        ),
      )}
    </div>
  );
}

/**
 * A supporter's letter as an email (ThreadEmail), its body the changes they
 * made to the draft the campaign gave them: each paragraph they changed,
 * added or cut, word by word, and between them, the paragraphs they left
 * alone, folded to a line saying how many, which a click unfolds, as the
 * campaign's text is known already. At the right of the subject's line, a
 * button shows the letter as sent instead, then the changes again. With no
 * draft kept, the letter alone, and no button.
 */
export default function LetterChanges({
  from,
  to,
  at,
  subject,
  sent,
  draft,
}: {
  from: ReactNode;
  to: string;
  at: string | null;
  subject: string;
  sent: string;
  draft: string | null;
}) {
  const [asSent, setAsSent] = useState(false);
  const [unfolded, setUnfolded] = useState<number[]>([]);
  const email = { from, to, at, subject };
  if (draft === null) {
    return (
      <ThreadEmail {...email}>
        <div className={styles.text}>{sent}</div>
      </ThreadEmail>
    );
  }
  const toggle = (
    <button type="button" className={styles.toggle} onClick={() => setAsSent(!asSent)}>
      {asSent ? copy.showChanges : copy.asSent}
    </button>
  );
  return (
    <ThreadEmail {...email} action={toggle}>
      {asSent ? (
        <div className={styles.text}>{sent}</div>
      ) : (
        <div className={styles.changes}>
          {changeBlocks(draft, sent).map((block, i) =>
            block.kind === "changed" ? (
              <Changes key={i} changes={block.changes} />
            ) : unfolded.includes(i) ? (
              <div key={i} className={styles.text}>
                {block.paragraphs.join("\n\n")}
              </div>
            ) : (
              <button key={i} type="button" className={styles.fold} onClick={() => setUnfolded([...unfolded, i])}>
                {copy.folded(block.paragraphs.length)}
              </button>
            ),
          )}
        </div>
      )}
    </ThreadEmail>
  );
}
