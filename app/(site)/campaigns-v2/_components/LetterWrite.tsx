"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { copy } from "@/lib/content/email-your-mp";
import { campaignBySlug, campaignPath } from "@/lib/email-your-mp";
import { readDraft, readLookup, type Draft, type Lookup } from "./draft";
import LetterForm from "./LetterForm";
import MpCard from "./MpCard";
import styles from "./EmailYourMp.module.css";

type Writing = { lookup: Lookup | Draft; draft?: Draft };

/**
 * The page for writing the letter, after "Find my MP": the MP, then the
 * form. Carries on with the draft when coming back from the preview.
 */
export default function LetterWrite({ campaignSlug }: { campaignSlug: string }) {
  const campaign = campaignBySlug(campaignSlug)!;
  // undefined until it's been read from sessionStorage, null if there's no lookup.
  const [writing, setWriting] = useState<Writing | null>();

  useEffect(() => {
    const draft = readDraft(campaignSlug);
    const lookup = readLookup(campaignSlug);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- once, on load, from sessionStorage, which the server render couldn't read
    setWriting(draft ? { lookup: draft, draft } : lookup && { lookup });
  }, [campaignSlug]);

  if (writing === undefined) return null;
  if (writing === null) {
    return (
      <div className={styles.tool}>
        <p>{copy.write.none}</p>
        <p>
          <Link href={`${campaignPath(campaign)}#email-your-mp`}>{copy.preview.backToForm}</Link>
        </p>
      </div>
    );
  }
  const { lookup, draft } = writing;
  // Said once, on arriving; not when coming back from the preview.
  const movedFrom = draft ? undefined : campaignBySlug((lookup as Lookup).movedFrom ?? "");
  return (
    <div className={styles.tool}>
      {movedFrom && <p className={styles.notice}>{movedFrom.movedOn}</p>}
      <MpCard mp={lookup.mp} />
      <LetterForm campaign={campaign} mp={lookup.mp} statuses={lookup.statuses} senderName={lookup.name} postcode={lookup.postcode} draft={draft} />
    </div>
  );
}
