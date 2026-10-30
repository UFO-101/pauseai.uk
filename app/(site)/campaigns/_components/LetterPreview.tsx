"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Controls";
import { FieldError } from "@/components/ui/Field";
import { copy } from "@/lib/content/email-your-mp";
import { campaignBySlug, campaignPath } from "@/lib/email-your-mp";
import { toHtml } from "@/lib/letter-format";
import AttachmentChips from "./AttachmentChips";
import { markSent, readDraft, type Draft } from "./draft";
import Turnstile from "./Turnstile";
import { Column } from "./FormParts";
import styles from "./LetterPreview.module.css";

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
 * The letter from the form, exactly as the MP will get it, name, address and
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
      <Column>
        <p>{copy.preview.none}</p>
        <p>
          <Link href={formPath}>{copy.preview.backToForm}</Link>
        </p>
      </Column>
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
      // Still pending while the next page loads.
      if (!sent) {
        setSending(false);
        setTurnstileToken("");
        setTurnstileRound((round) => round + 1);
      }
    }
  }

  // The same HTML the server sends, from the same draft: text is escaped.
  const html = toHtml(letter.letter);

  return (
    <div className={styles.previewPage}>
      <article className={styles.preview}>
        <dl className={styles.envelope}>
          <dt>{copy.preview.to}</dt>
          <dd>{letter.mp.name}</dd>
          <dt>{copy.form.subjectLabel}</dt>
          <dd>{letter.subject}</dd>
        </dl>
        <div className={styles.previewBody} dangerouslySetInnerHTML={{ __html: html }} />
        {campaign.attachments.length > 0 && (
          <AttachmentChips attachments={campaign.attachments} label={copy.form.attachments} ruled />
        )}
      </article>

      <p className={styles.small}>{copy.preview.replyNotice}</p>

      <Checkbox name="consent" checked={consent} onChange={setConsent}>
        {copy.preview.consent}
      </Checkbox>

      {turnstileSiteKey && (
        <div className={styles.turnstile}>
          <Turnstile key={turnstileRound} siteKey={turnstileSiteKey} onToken={setTurnstileToken} />
        </div>
      )}

      {error && <FieldError announce="alert">{error}</FieldError>}

      <div className={styles.actions}>
        <ButtonLink variant="ghost" href={`${campaignPath(campaign)}/write`}>
          {copy.preview.edit}
        </ButtonLink>
        <Button
          variant="primary"
          type="button"
          onClick={send}
          disabled={Boolean(turnstileSiteKey) && !turnstileToken}
          pending={sending}
        >
          {copy.preview.send}
        </Button>
      </div>
    </div>
  );
}
