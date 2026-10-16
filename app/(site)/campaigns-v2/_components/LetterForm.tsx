"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { copy, type Campaign } from "@/lib/content/email-your-mp";
import { campaignPath, draftLetter, looksLikeEmail, type Mp, type MpStatuses } from "@/lib/email-your-mp";
import AttachmentChips from "./AttachmentChips";
import { saveDraft, type Draft } from "./draft";
import LetterEditor from "./LetterEditor";
import styles from "./EmailYourMp.module.css";

type Props = {
  campaign: Campaign;
  mp: Mp;
  statuses: MpStatuses;
  senderName: string;
  postcode: string;
  /** The draft to carry on with, when coming back from the preview. */
  draft?: Draft;
};

/** The letter to one MP for one campaign: edit it, then go to the preview, which sends it. */
export default function LetterForm({ campaign, mp, statuses, senderName, postcode, draft }: Props) {
  const router = useRouter();
  const addressHint = useId();
  const letterId = useId();
  const letterTips = useId();
  const [email, setEmail] = useState(draft?.email ?? "");
  const [address, setAddress] = useState(draft?.address ?? "");
  const [subject, setSubject] = useState(draft?.subject ?? campaign.subject);
  const [letter, setLetter] = useState(
    () =>
      draft?.letter ??
      draftLetter(campaign, { salutation: mp.salutation, constituency: mp.constituency, senderName, statuses }),
  );
  const [nickname, setNickname] = useState(draft?.nickname ?? "");
  const [error, setError] = useState("");

  function preview() {
    if (!email.trim()) return setError(copy.form.emailRequired);
    if (!looksLikeEmail(email.trim())) return setError(copy.errors.invalidEmail);
    if (!address.trim()) return setError(copy.form.addressRequired);
    const saved = saveDraft({
      campaign: campaign.slug,
      name: senderName,
      postcode,
      mp,
      statuses,
      email: email.trim(),
      address,
      subject,
      letter,
      nickname,
    });
    if (!saved) return setError(copy.form.storageFailed);
    setError("");
    router.push(`${campaignPath(campaign)}/preview`);
  }

  return (
    // Its button is type="button", so Enter in a field never submits it.
    <form className={styles.letter} noValidate>
      {/* Hidden from people; only a form-filling bot completes it. */}
      <label className={styles.honeypot} aria-hidden="true">
        Nickname
        <input
          name="nickname"
          tabIndex={-1}
          autoComplete="off"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
      </label>

      <label>
        {copy.form.emailLabel}
        <input
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <div className={styles.field}>
        <label>
          {copy.form.addressLabel}
          <textarea
            name="address"
            rows={3}
            autoComplete="street-address"
            aria-describedby={addressHint}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </label>
        <small id={addressHint}>{copy.form.addressHint}</small>
      </div>
      <label>
        {copy.form.subjectLabel}
        <input name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </label>
      <div className={styles.field}>
        <label id={letterId}>{copy.form.letterLabel}</label>
        <ul id={letterTips} className={styles.tips}>
          {copy.form.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
        <LetterEditor initial={letter} onChange={setLetter} labelledBy={letterId} describedBy={letterTips} />
      </div>

      {campaign.attachments.length > 0 && (
        <div className={styles.field}>
          <p className={styles.fieldLabel}>{copy.form.attachments}</p>
          <AttachmentChips attachments={campaign.attachments} label={copy.form.attachments} />
        </div>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <Button variant="primary" type="button" className={styles.next} onClick={preview}>
        {copy.form.preview}
      </Button>
    </form>
  );
}
