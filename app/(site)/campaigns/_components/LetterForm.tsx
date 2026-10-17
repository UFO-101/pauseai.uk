"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { copy, type Campaign } from "@/lib/content/email-your-mp";
import {
  campaignPath,
  draftLetter,
  looksLikeEmail,
  signatureAddress,
  type Mp,
  type MpStatuses,
} from "@/lib/email-your-mp";
import AttachmentChips from "./AttachmentChips";
import { saveDraft, type Draft } from "./draft";
import LetterEditor from "./LetterEditor";
import Required from "./Required";
import { ErrorText, Field, Input } from "./FormParts";
import styles from "./LetterForm.module.css";

type Props = {
  campaign: Campaign;
  mp: Mp;
  statuses: MpStatuses;
  senderName: string;
  /** From the lookup: the first line of their address, under their name. */
  address: string;
  postcode: string;
  /** The draft to carry on with, when coming back from the preview. */
  draft?: Draft;
};

/** The letter to one MP for one campaign: edit it, then go to the preview, which sends it. */
export default function LetterForm({ campaign, mp, statuses, senderName, address, postcode, draft }: Props) {
  const router = useRouter();
  const letterId = useId();
  const letterTips = useId();
  const [email, setEmail] = useState(draft?.email ?? "");
  const [subject, setSubject] = useState(draft?.subject ?? campaign.subject);
  const [letter, setLetter] = useState(
    () =>
      draft?.letter ??
      draftLetter(
        campaign,
        { salutation: mp.salutation, constituency: mp.constituency, senderName, statuses },
        signatureAddress(address, postcode),
      ),
  );
  const [nickname, setNickname] = useState(draft?.nickname ?? "");
  const [error, setError] = useState("");

  function preview() {
    if (!email.trim()) return setError(copy.form.emailRequired);
    if (!looksLikeEmail(email.trim())) return setError(copy.errors.invalidEmail);
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
        <Required>{copy.form.emailLabel}</Required>
        <Input
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        {copy.form.subjectLabel}
        <Input name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </label>
      <Field>
        <label id={letterId}>{copy.form.letterLabel}</label>
        <ul id={letterTips} className={styles.tips}>
          {copy.form.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
        <LetterEditor initial={letter} onChange={setLetter} labelledBy={letterId} describedBy={letterTips} />
      </Field>

      {campaign.attachments.length > 0 && (
        <Field>
          <p className={styles.fieldLabel}>{copy.form.attachments}</p>
          <AttachmentChips attachments={campaign.attachments} label={copy.form.attachments} />
        </Field>
      )}

      {error && <ErrorText>{error}</ErrorText>}

      <Button variant="primary" type="button" className={styles.next} onClick={preview}>
        {copy.form.preview}
      </Button>
    </form>
  );
}
