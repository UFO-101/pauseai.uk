"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { copy } from "@/lib/content/email-your-mp";
import { campaignBySlug, campaignPath, campaignToMoveTo, doneAll, isDone, type Mp, type MpStatuses } from "@/lib/email-your-mp";
import type { Place } from "@/lib/events";
import { TEST_MPS } from "@/lib/test-mps";
import { readLookup, saveLookup } from "./draft";
import MpCard from "./MpCard";
import styles from "./EmailYourMp.module.css";

type Found = { mp: Mp; statuses: MpStatuses };
type LookupResult = Found & { place: Place | null };

/**
 * Name and postcode, to find the MP. Then the page for writing the letter:
 * this campaign's or, if the MP has already done it, the first one they
 * haven't, which says why. When there's no letter to write (no email for
 * the MP, or every campaign done), it stays and says so. (A slug, because
 * campaigns hold functions, which can't be passed from the server.)
 */
type Props = {
  campaignSlug: string;
  /** Lists the test MPs' postcodes under the form: for sites other than production. */
  showTestMps?: boolean;
};

export default function EmailYourMpTool({ campaignSlug, showTestMps }: Props) {
  const campaign = campaignBySlug(campaignSlug)!;
  const router = useRouter();
  const testPostcodes = useId();
  const [name, setName] = useState("");
  const [postcode, setPostcode] = useState("");
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState("");
  const [found, setFound] = useState<Found | null>(null);

  // Coming back from writing a letter: the name and postcode, as they were.
  // After the page loads, as the server can't see sessionStorage.
  useEffect(() => {
    const last = readLookup();
    if (!last) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- once, on load, from sessionStorage, which the server render couldn't read
    setName(last.name);
    setPostcode(last.postcode);
  }, []);

  async function lookUp(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError(copy.lookup.nameRequired);
    if (!postcode.trim()) return setError(copy.lookup.postcodeRequired);
    setError("");
    setFound(null);
    setLooking(true);
    let moving = false;
    try {
      const res = await fetch("/api/email-your-mp/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postcode }),
      });
      const result = await res.json();
      if (!result.ok) return setError(result.message);
      const { mp, statuses, place }: LookupResult = result;
      const target = campaignToMoveTo(campaign, statuses) ?? campaign;
      const canWrite = !!mp.email && !isDone(target, statuses);
      const movedFrom = target === campaign ? undefined : campaign.slug;
      moving = canWrite && saveLookup({ campaign: target.slug, name: name.trim(), postcode: postcode.trim(), mp, statuses, movedFrom, place });
      // Still "looking" while the next page loads.
      if (moving) return router.push(`${campaignPath(target)}/write`);
      setFound({ mp, statuses });
      if (canWrite) setError(copy.form.storageFailed);
    } catch {
      setError(copy.lookup.failed);
    } finally {
      if (!moving) setLooking(false);
    }
  }

  return (
    <div className={styles.tool}>
      <form className={styles.lookup} onSubmit={lookUp} noValidate>
        <label>
          {copy.lookup.nameLabel}
          <input name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} disabled={looking} />
        </label>
        <div className={styles.field}>
          <label>
            {copy.lookup.postcodeLabel}
            <input
              name="postcode"
              autoComplete="postal-code"
              aria-describedby={showTestMps ? testPostcodes : undefined}
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              disabled={looking}
            />
          </label>
          {showTestMps && (
            <small id={testPostcodes}>
              {copy.lookup.testPostcodes(TEST_MPS.map((mp) => `${mp.postcode.slice(0, -3)} ${mp.postcode.slice(-3)} (${mp.name})`).join(", "))}
            </small>
          )}
        </div>
        <div className={styles.lookupButton}>
          <Button variant="primary" type="submit" pending={looking}>
            {looking ? copy.lookup.looking : copy.lookup.button}
          </Button>
        </div>
      </form>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {/* No letter to write here: the MP has no email, or has done this campaign and the page couldn't move on. */}
      {found && (
        <>
          <MpCard mp={found.mp} />
          {found.mp.email && isDone(campaign, found.statuses) && (
            <p className={styles.notice}>{doneAll(found.statuses) ? copy.lookup.allDone : campaign.alreadyDone}</p>
          )}
        </>
      )}
    </div>
  );
}
