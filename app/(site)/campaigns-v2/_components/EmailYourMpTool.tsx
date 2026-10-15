"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { copy, type Campaign } from "@/lib/content/email-your-mp";
import { campaignBySlug, campaignPath, campaignToMoveTo, doneAll, isDone, type Mp, type MpStatuses } from "@/lib/email-your-mp";
import { navigate } from "@/lib/navigate";
import { TEST_MPS } from "@/lib/test-mps";
import { readDraft, type Draft } from "./draft";
import { leaveHandoff, takeHandoff } from "./handoff";
import LetterForm from "./LetterForm";
import styles from "./EmailYourMp.module.css";

type Found = { mp: Mp; statuses: MpStatuses; name: string; postcode: string };

/**
 * Name and postcode, then the MP and the campaign's letter. If the MP has
 * already done this campaign, it moves on to the first one they haven't,
 * which opens with the lookup done and says why. (A slug, because campaigns
 * hold functions, which can't be passed from the server.)
 */
type Props = {
  campaignSlug: string;
  /** Lists the test MPs' postcodes under the form: for sites other than production. */
  showTestMps?: boolean;
};

export default function EmailYourMpTool({ campaignSlug, showTestMps }: Props) {
  const campaign = campaignBySlug(campaignSlug)!;
  const testPostcodes = useId();
  const [name, setName] = useState("");
  const [postcode, setPostcode] = useState("");
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  // The campaign whose page moved on to this one.
  const [movedFrom, setMovedFrom] = useState<Campaign | undefined>();
  // The letter being written, when coming back from its preview.
  const [draft, setDraft] = useState<Draft | undefined>();

  // After the page loads, as the server can't see sessionStorage: a lookup
  // another campaign's page moved on with, or else a letter to carry on with.
  useEffect(() => {
    const handoff = takeHandoff(campaignSlug);
    const restored = handoff ?? readDraft(campaignSlug);
    if (!restored) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- once, on load, from sessionStorage, which the server render couldn't read
    setName(restored.name);
    setPostcode(restored.postcode);
    setFound({ mp: restored.mp, statuses: restored.statuses, name: restored.name, postcode: restored.postcode });
    if (handoff) setMovedFrom(campaignBySlug(handoff.from));
    else setDraft(restored as Draft);
  }, [campaignSlug]);

  async function lookUp(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError(copy.lookup.nameRequired);
    if (!postcode.trim()) return setError(copy.lookup.postcodeRequired);
    setError("");
    setFound(null);
    setMovedFrom(undefined);
    setDraft(undefined);
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
      const lookup = { mp: result.mp, statuses: result.statuses, name: name.trim(), postcode: postcode.trim() };
      const next = campaignToMoveTo(campaign, lookup.statuses);
      moving = !!next && leaveHandoff({ from: campaign.slug, to: next.slug, ...lookup });
      // Still "looking" while the next page loads, which opens at the form.
      if (moving) navigate(`${campaignPath(next!)}#email-your-mp`);
      else setFound(lookup);
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

      {found && (
        <>
          {movedFrom && <p className={styles.notice}>{movedFrom.movedOn}</p>}
          <div className={styles.mp}>
            <h2>{found.mp.name}</h2>
            <p>{copy.lookup.mpOf(found.mp.constituency)}</p>
            {/* data-mp-email: the visual diff masks it, as the test MP's inbox differs between hosts. */}
            <p data-mp-email>{found.mp.email ? <a href={`mailto:${found.mp.email}`}>{found.mp.email}</a> : copy.lookup.noEmail}</p>
          </div>
          {/* Done here, and the page couldn't move on: no letter to write. */}
          {isDone(campaign, found.statuses) ? (
            <p className={styles.notice}>{doneAll(found.statuses) ? copy.lookup.allDone : campaign.alreadyDone}</p>
          ) : (
            found.mp.email && (
              <LetterForm
                // A new MP starts a new letter.
                key={found.mp.constituency}
                campaign={campaign}
                mp={found.mp}
                statuses={found.statuses}
                senderName={found.name}
                postcode={found.postcode}
                draft={draft}
              />
            )
          )}
        </>
      )}
    </div>
  );
}
