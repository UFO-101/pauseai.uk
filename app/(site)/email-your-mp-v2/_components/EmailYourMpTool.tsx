"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { copy } from "@/lib/content/email-your-mp";
import { campaignBySlug, chooseCampaign, type Mp, type MpStatuses } from "@/lib/email-your-mp";
import LetterForm from "./LetterForm";
import styles from "./EmailYourMp.module.css";

type Found = { mp: Mp; statuses: MpStatuses; name: string; postcode: string };

/**
 * Name and postcode, then the MP and the letter. With a `campaignSlug` the
 * page is that campaign's; without, the campaign is the first this MP hasn't
 * done. (A slug, because campaigns hold functions, which can't be passed from
 * the server.)
 */
export default function EmailYourMpTool({ campaignSlug, turnstileSiteKey }: { campaignSlug?: string; turnstileSiteKey?: string }) {
  const [name, setName] = useState("");
  const [postcode, setPostcode] = useState("");
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState("");
  const [found, setFound] = useState<Found | null>(null);

  async function lookUp(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError(copy.lookup.nameRequired);
    if (!postcode.trim()) return setError(copy.lookup.postcodeRequired);
    setError("");
    setFound(null);
    setLooking(true);
    try {
      const res = await fetch("/api/email-your-mp/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postcode }),
      });
      const result = await res.json();
      if (result.ok) setFound({ mp: result.mp, statuses: result.statuses, name: name.trim(), postcode: postcode.trim() });
      else setError(result.message);
    } catch {
      setError(copy.lookup.failed);
    } finally {
      setLooking(false);
    }
  }

  const campaign = campaignSlug ? campaignBySlug(campaignSlug) : undefined;
  const chosen = found && (campaign ?? chooseCampaign(found.statuses));

  return (
    <div className={styles.tool}>
      <form className={styles.lookup} onSubmit={lookUp} noValidate>
        <label>
          {copy.lookup.nameLabel}
          <input name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} disabled={looking} />
        </label>
        <label>
          {copy.lookup.postcodeLabel}
          <input name="postcode" autoComplete="postal-code" value={postcode} onChange={(e) => setPostcode(e.target.value)} disabled={looking} />
        </label>
        <Button variant="primary" type="submit" disabled={looking}>
          {looking ? copy.lookup.looking : copy.lookup.button}
        </Button>
      </form>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {found && chosen && (
        <>
          <div className={styles.mp}>
            <h2>{found.mp.name}</h2>
            <p>{copy.lookup.mpOf(found.mp.constituency)}</p>
            <p>{found.mp.email ?? copy.lookup.noEmail}</p>
          </div>
          {found.mp.email && (
            <LetterForm
              // A new MP or campaign starts a new letter.
              key={`${found.mp.constituency}/${chosen.slug}`}
              campaign={chosen}
              mp={found.mp}
              statuses={found.statuses}
              senderName={found.name}
              postcode={found.postcode}
              turnstileSiteKey={turnstileSiteKey}
            />
          )}
        </>
      )}
    </div>
  );
}
