"use client";

import { useState } from "react";
import { Segmented } from "@/components/ui/Controls";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import { wordDiff } from "@/lib/letter-changes";
import styles from "./LetterChanges.module.css";

const copy = staffCopy.letterChanges;

type View = "changes" | "sent" | "draft";

/**
 * A supporter's letter as they sent it, against the draft the campaign
 * gave them, word by word, with a switch above it: the changes (the
 * default: what they added marked, what they cut struck through), the
 * letter as sent, or the starting draft. A draft rebuilt after a deploy
 * changed the campaign's text is said to be approximate. With no draft
 * kept, the letter alone.
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
  const [view, setView] = useState<View>("changes");
  if (draft === null) return <div className={styles.text}>{sent}</div>;
  return (
    <div className={styles.changes}>
      {approximate && <Muted>{copy.approximate}</Muted>}
      <Segmented<View>
        label={copy.label}
        value={view}
        onChange={setView}
        options={[
          { value: "changes", label: copy.views.changes },
          { value: "sent", label: copy.views.sent },
          { value: "draft", label: copy.views.draft },
        ]}
      />
      <div className={styles.text}>
        {view === "sent"
          ? sent
          : view === "draft"
            ? draft
            : wordDiff(draft, sent).map((change, i) =>
                change.kind === "added" ? (
                  <ins key={i}>{change.text}</ins>
                ) : change.kind === "removed" ? (
                  <del key={i}>{change.text}</del>
                ) : (
                  <span key={i}>{change.text}</span>
                ),
              )}
      </div>
    </div>
  );
}
