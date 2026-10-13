"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { copy, type Campaign } from "@/lib/content/email-your-mp";
import { draftLetter, fullLetter, isDone, type Mp, type MpStatuses } from "@/lib/email-your-mp";
import Turnstile from "./Turnstile";
import styles from "./EmailYourMp.module.css";

type Props = {
  campaign: Campaign;
  mp: Mp;
  statuses: MpStatuses;
  senderName: string;
  postcode: string;
  turnstileSiteKey?: string;
};

/** Tells Google Tag Manager a letter was accepted; its trigger fires the Ads conversion. */
function countConversion() {
  const w = window as typeof window & { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event: "mp_email_sent" });
}

/** The letter to one MP for one campaign: edit it, then send it. */
export default function LetterForm({ campaign, mp, statuses, senderName, postcode, turnstileSiteKey }: Props) {
  const done = isDone(campaign, statuses);
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(campaign.subject);
  const [letter, setLetter] = useState(() =>
    draftLetter(campaign, statuses, { salutation: mp.salutation, constituency: mp.constituency, senderName }),
  );
  const [consent, setConsent] = useState(false);
  const [nickname, setNickname] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  // Bumped after each attempt to remount Turnstile: its tokens are single use.
  const [turnstileRound, setTurnstileRound] = useState(0);

  // The server adds the sender's name and address under the letter.
  const signature = fullLetter("", senderName, [postcode.toUpperCase()]).trimStart();

  function askToConfirm() {
    if (!email.trim()) return setError(copy.form.emailRequired);
    setError("");
    setConfirming(true);
  }

  async function send() {
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/email-your-mp/letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign: campaign.slug, name: senderName, postcode, email, subject, letter, consent, nickname, turnstileToken }),
      });
      const result = await res.json();
      if (result.ok) {
        countConversion();
        setSent(true);
      } else {
        setError(result.message);
        setConfirming(false);
      }
    } catch {
      setError(copy.form.networkError);
      setConfirming(false);
    } finally {
      setSending(false);
      setTurnstileToken("");
      setTurnstileRound((round) => round + 1);
    }
  }

  if (sent) {
    return (
      <p className={styles.success} role="status">
        {copy.form.sent(mp.name)}
      </p>
    );
  }

  return (
    // Its buttons are all type="button", so Enter in a field never submits it.
    <form className={styles.letter} noValidate>
      {done && <p className={styles.notice}>{campaign.alreadyDone}</p>}

      {/* Hidden from people; only a form-filling bot completes it. */}
      <label className={styles.honeypot} aria-hidden="true">
        Nickname
        <input name="nickname" tabIndex={-1} autoComplete="off" value={nickname} onChange={(e) => setNickname(e.target.value)} />
      </label>

      <label>
        {copy.form.emailLabel}
        <input name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        {copy.form.subjectLabel}
        <input name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </label>
      <label>
        {copy.form.letterLabel}
        <textarea name="letter" rows={14} value={letter} onChange={(e) => setLetter(e.target.value)} />
      </label>
      <pre className={styles.signature}>{signature}</pre>

      {campaign.attachments.length > 0 && (
        <div>
          <h3>{copy.form.attachments}</h3>
          <ul className={styles.attachments}>
            {campaign.attachments.map((attachment) => (
              <li key={attachment.file}>
                <a href={`/pdfs/${attachment.file}`} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a small thumbnail, already sized */}
                  <img src={`/pdfs/${attachment.thumbnail}`} alt="" width={120} />
                  <span>{attachment.title}</span>
                  <span>{attachment.subtitle}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <label className={styles.consent}>
        <input type="checkbox" name="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>{copy.form.consent}</span>
      </label>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {confirming ? (
        <div className={styles.confirm}>
          <p>{copy.form.confirmPrompt(mp.name)}</p>
          {turnstileSiteKey && <Turnstile key={turnstileRound} siteKey={turnstileSiteKey} onToken={setTurnstileToken} />}
          <div className={styles.actions}>
            <Button variant="ghost" type="button" onClick={() => setConfirming(false)} disabled={sending}>
              {copy.form.cancel}
            </Button>
            <Button variant="primary" type="button" onClick={send} disabled={sending || (Boolean(turnstileSiteKey) && !turnstileToken)}>
              {sending ? copy.form.sending : copy.form.confirmSend}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="primary" type="button" onClick={askToConfirm}>
          {copy.form.send}
        </Button>
      )}
    </form>
  );
}
