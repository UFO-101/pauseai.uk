"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { copy } from "@/lib/content/email-your-mp";
import { campaignBySlug, campaignPath, fullLetter, signatureAddress } from "@/lib/email-your-mp";
import { toHtml } from "@/lib/letter-format";
import { markSent, readDraft, type Draft } from "./draft";
import Turnstile from "./Turnstile";
import styles from "./EmailYourMp.module.css";

type Props = {
  campaignSlug: string;
  turnstileSiteKey?: string;
};

/**
 * Tells Google Tag Manager a letter was sent; its trigger fires the Ads
 * conversion.
 */
function countConversion() {
  const w = window as typeof window & { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event: "mp_email_sent" });
}

/**
 * The letter from the form, exactly as the MP will get it, signature and
 * all, with the anti-spam check and the button that sends it.
 */
export default function LetterPreview({ campaignSlug, turnstileSiteKey }: Props) {
  const campaign = campaignBySlug(campaignSlug)!;
  const router = useRouter();
  // undefined until it's been read from sessionStorage, null if there's none.
  const [draft, setDraft] = useState<Draft | null>();
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  // Bumped after each failed attempt to remount Turnstile: its tokens are single use.
  const [turnstileRound, setTurnstileRound] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- once, on load, from sessionStorage, which the server render couldn't read
    setDraft(readDraft(campaignSlug));
  }, [campaignSlug]);

  const formPath = `${campaignPath(campaign)}#email-your-mp`;
  if (draft === undefined) return null;
  if (draft === null) {
    return (
      <div className={styles.tool}>
        <p>{copy.preview.none}</p>
        <p>
          <Link href={formPath}>{copy.preview.backToForm}</Link>
        </p>
      </div>
    );
  }
  const letter = draft;

  async function send() {
    setSending(true);
    setError("");
    let sent = false;
    try {
      const res = await fetch("/api/email-your-mp/letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign: campaign.slug,
          name: letter.name,
          postcode: letter.postcode,
          address: letter.address,
          email: letter.email,
          subject: letter.subject,
          letter: letter.letter,
          consent,
          nickname: letter.nickname,
          turnstileToken,
        }),
      });
      const result = await res.json();
      if (result.ok) {
        sent = true;
        countConversion();
        markSent({ campaign: campaign.slug, mpName: letter.mp.name });
        // Next's own navigation, not a page load, so GTM's request for the
        // conversion isn't cut off.
        router.push(`${campaignPath(campaign)}/sent`);
      } else {
        setError(result.message);
      }
    } catch {
      setError(copy.preview.networkError);
    } finally {
      // Still "sending" while the next page loads.
      if (!sent) {
        setSending(false);
        setTurnstileToken("");
        setTurnstileRound((round) => round + 1);
      }
    }
  }

  // The same HTML the server sends, from the same draft: text is escaped.
  const html = toHtml(fullLetter(letter.letter, letter.name, signatureAddress(letter.address, letter.postcode)));

  return (
    <div className={styles.tool}>
      <article className={styles.preview}>
        <dl className={styles.envelope}>
          <dt>{copy.preview.to}</dt>
          <dd>{letter.mp.name}</dd>
          <dt>{copy.form.subjectLabel}</dt>
          <dd>{letter.subject}</dd>
        </dl>
        <div className={styles.previewBody} dangerouslySetInnerHTML={{ __html: html }} />
        {campaign.attachments.length > 0 && (
          <ul className={styles.attached} aria-label={copy.form.attachments}>
            {campaign.attachments.map((attachment) => (
              <li key={attachment.file}>
                <a href={`/pdfs/${attachment.file}`} target="_blank" rel="noreferrer">
                  {/* A paperclip (Lucide's, ISC licence), as attachments are shown in mail apps. */}
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable={false}>
                    <path
                      d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {attachment.file}
                </a>
              </li>
            ))}
          </ul>
        )}
      </article>

      <p className={styles.small}>{copy.preview.replyNotice}</p>

      <label className={styles.consent}>
        <input type="checkbox" name="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>{copy.preview.consent}</span>
      </label>

      {turnstileSiteKey && (
        <div className={styles.turnstile}>
          <Turnstile key={turnstileRound} siteKey={turnstileSiteKey} onToken={setTurnstileToken} />
        </div>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.actions}>
        <ButtonLink variant="ghost" href={formPath}>
          {copy.preview.edit}
        </ButtonLink>
        <Button variant="primary" type="button" onClick={send} disabled={sending || (Boolean(turnstileSiteKey) && !turnstileToken)}>
          {sending ? copy.preview.sending : copy.preview.send}
        </Button>
      </div>
    </div>
  );
}
