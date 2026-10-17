"use client";

import { useEffect, useState } from "react";
import type { Campaign } from "@/lib/content/email-your-mp";
import { campaignBySlug } from "@/lib/email-your-mp";
import { readLookup } from "./draft";
import { Notice } from "./FormParts";
import styles from "./MovedOnNotice.module.css";

/**
 * At the top of a campaign's page, when another campaign's page moved on to
 * it because the MP had done that one: says why. Gone once the sender finds
 * their MP again here, as that lookup moved from nowhere.
 */
export default function MovedOnNotice({ campaignSlug }: { campaignSlug: string }) {
  const [movedFrom, setMovedFrom] = useState<Campaign>();

  // After the page loads, as the server can't see sessionStorage.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- once, on load, from sessionStorage, which the server render couldn't read
    setMovedFrom(campaignBySlug(readLookup(campaignSlug)?.movedFrom ?? ""));
  }, [campaignSlug]);

  return movedFrom ? (
    <div className={styles.movedOn}>
      <Notice>{movedFrom.movedOn}</Notice>
    </div>
  ) : null;
}
