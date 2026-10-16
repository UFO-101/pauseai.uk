"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { copy } from "@/lib/content/email-your-mp";
import { campaignBySlug, campaignPath, campaignToMoveTo, isDone, type Mp, type MpStatuses } from "@/lib/email-your-mp";
import type { Place } from "@/lib/events";
import { TEST_MPS, type TestMp } from "@/lib/test-mps";
import { readLookup, saveLookup } from "./draft";
import MpCard from "./MpCard";
import Required from "./Required";
import styles from "./EmailYourMp.module.css";

type Found = { mp: Mp; statuses: MpStatuses };
type LookupResult = Found & { place: Place | null };

/**
 * Name, address and postcode, to find the MP. Then the page for writing this
 * campaign's letter. If the MP has already done this campaign, it goes to
 * the page of the first one they haven't instead, which says why
 * (MovedOnNotice), with the form filled in. There always is
 * one, as the last campaign is one nobody has done. When there's no letter
 * to write here (no email for the MP, or the browser won't keep the
 * lookup), it stays and says so. (A slug, because
 * campaigns hold functions, which can't be passed from the server.)
 */
type Props = {
  campaignSlug: string;
  /** Lists the test MPs' postcodes under the form: for sites other than production. */
  showTestMps?: boolean;
};

/** "ZZ9 9ZS (Signy McTestface MP): signed “Regulate AI developers now”". */
function testMpLine(mp: TestMp): string {
  const postcode = `${mp.postcode.slice(0, -3)} ${mp.postcode.slice(-3)}`;
  const purpose = mp.noEmail
    ? [copy.lookup.testMpNoEmail]
    : Object.keys(mp.statuses).map((slug) => copy.lookup.testMpSigned(campaignBySlug(slug)!.title));
  return `${postcode} (${mp.name})${purpose.length ? `: ${purpose.join(", ")}` : ""}`;
}

export default function EmailYourMpTool({ campaignSlug, showTestMps }: Props) {
  const campaign = campaignBySlug(campaignSlug)!;
  const router = useRouter();
  const testPostcodes = useId();
  const addressHint = useId();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState("");
  const [found, setFound] = useState<Found | null>(null);

  // Coming back from writing a letter: the form, as it was.
  // After the page loads, as the server can't see sessionStorage.
  useEffect(() => {
    const last = readLookup();
    if (!last) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- once, on load, from sessionStorage, which the server render couldn't read
    setName(last.name);
    setAddress(last.address);
    setPostcode(last.postcode);
  }, []);

  async function lookUp(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError(copy.lookup.nameRequired);
    if (!address.trim()) return setError(copy.lookup.addressRequired);
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
      // The target is never one the MP has done: there's always one to move on to.
      const canWrite = !!mp.email;
      const movedFrom = target === campaign ? undefined : campaign.slug;
      moving =
        canWrite &&
        saveLookup({
          campaign: target.slug,
          name: name.trim(),
          address: address.trim(),
          postcode: postcode.trim(),
          mp,
          statuses,
          movedFrom,
          place,
        });
      // Still "looking" while the next page loads.
      if (moving) return router.push(movedFrom ? campaignPath(target) : `${campaignPath(target)}/write`);
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
        <label className={styles.lookupWide}>
          <Required>{copy.lookup.nameLabel}</Required>
          <input
            name="name"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={looking}
          />
        </label>
        <div className={styles.field}>
          <label>
            <Required>{copy.lookup.addressLabel}</Required>
            <input
              name="address"
              required
              autoComplete="address-line1"
              aria-describedby={addressHint}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={looking}
            />
          </label>
          <small id={addressHint}>{copy.lookup.addressHint}</small>
        </div>
        <div className={styles.field}>
          <label>
            <Required>{copy.lookup.postcodeLabel}</Required>
            <input
              name="postcode"
              required
              autoComplete="postal-code"
              aria-describedby={showTestMps ? testPostcodes : undefined}
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              disabled={looking}
            />
          </label>
          {showTestMps && (
            <details id={testPostcodes} className={styles.testPostcodes}>
              <summary>
                {copy.lookup.testPostcodes} {testMpLine(TEST_MPS[0])}
              </summary>
              <ul>
                {TEST_MPS.map((mp) => (
                  <li key={mp.postcode}>{testMpLine(mp)}</li>
                ))}
              </ul>
            </details>
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
            <p className={styles.notice}>{campaign.alreadyDone}</p>
          )}
        </>
      )}
    </div>
  );
}
