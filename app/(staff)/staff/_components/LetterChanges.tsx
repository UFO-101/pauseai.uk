"use client";

import { useState } from "react";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import { changeBlocks, type Change } from "@/lib/letter-changes";
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
 * A supporter's letter as the changes they made to the draft the campaign
 * gave them: each paragraph they changed, added or cut, word by word, and
 * between them, the paragraphs they left alone, folded to a line saying
 * how many, which a click unfolds, as the campaign's text is known already.
 * A button above shows the letter as sent instead, then the changes again. A draft
 * rebuilt after a deploy changed the campaign's text is said to be
 * approximate. With no draft kept, the letter alone.
 */
export default function LetterChanges({
  sent,
  draft,
  approximate,
}: {
  sent: string;
  draft: string | null;
  approximate: boolean;
}) {
  const [asSent, setAsSent] = useState(false);
  const [unfolded, setUnfolded] = useState<number[]>([]);
  if (draft === null) return <div className={styles.text}>{sent}</div>;
  const blocks = changeBlocks(draft, sent);
  const unchanged = !blocks.some((block) => block.kind === "changed");
  return (
    <div className={styles.changes}>
      <div className={styles.bar}>
        <Muted>{unchanged ? copy.unchanged : approximate ? copy.approximate : copy.intro}</Muted>
        <button type="button" className={styles.toggle} onClick={() => setAsSent(!asSent)}>
          {asSent ? copy.showChanges : copy.asSent}
        </button>
      </div>
      {asSent ? (
        <div className={styles.text}>{sent}</div>
      ) : (
        blocks.map((block, i) =>
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
        )
      )}
    </div>
  );
}
