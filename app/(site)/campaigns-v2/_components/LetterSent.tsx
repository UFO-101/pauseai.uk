"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { copy } from "@/lib/content/email-your-mp";
import { campaignBySlug, campaignPath } from "@/lib/email-your-mp";
import { readSent, type Sent } from "./draft";
import styles from "./EmailYourMp.module.css";

/** Thanks for the letter just sent, under the page's heading. Room for more to do, later. */
export default function LetterSent({ campaignSlug }: { campaignSlug: string }) {
  const campaign = campaignBySlug(campaignSlug)!;
  // undefined until it's been read from sessionStorage, null if there's none.
  const [sent, setSent] = useState<Sent | null>();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- once, on load, from sessionStorage, which the server render couldn't read
    setSent(readSent(campaignSlug));
  }, [campaignSlug]);

  if (sent === undefined) return null;
  if (sent === null) {
    return (
      <div className={styles.tool}>
        <p>{copy.sent.none}</p>
        <p>
          <Link href={`${campaignPath(campaign)}#email-your-mp`}>{copy.preview.backToForm}</Link>
        </p>
      </div>
    );
  }
  return (
    <p className={styles.success} role="status">
      {copy.sent.body(sent.mpName)}
    </p>
  );
}
