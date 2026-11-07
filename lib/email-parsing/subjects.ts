// What a message's subject and headers say about it: which letter it answers, and whether a machine sent it.

const AUTO_REPLY_SUBJECT = /^\s*(automatic reply|auto[- ]?reply|auto[- ]?response|out of (the )?office)\b/i;

/**
 * Whether an email was sent by a machine rather than a person: an office's
 * acknowledgement or out-of-office. By the headers that mark them (RFC 3834's
 * Auto-Submitted, and the older X-Autoreply, X-Autorespond and Precedence),
 * or failing those, a subject such as Outlook's "Automatic reply:". `header`
 * finds a header by its lowercased name.
 */
export function isMachineReply(header: (name: string) => string | undefined, subject: string): boolean {
  const value = (name: string) => header(name)?.trim().toLowerCase();
  const autoSubmitted = value("auto-submitted");
  if (autoSubmitted && autoSubmitted !== "no") return true;
  if (value("x-autoreply") !== undefined || value("x-autorespond") !== undefined) return true;
  if (["auto_reply", "bulk", "junk"].includes(value("precedence") ?? "")) return true;
  return AUTO_REPLY_SUBJECT.test(subject);
}

/** What a reply's subject says beside the letter's: without Re:, Automatic reply: and the like, or a case's reference. */
export function plainSubject(subject: string): string {
  return subject
    .replace(/\(?case ref:?[^)]*\)?/i, "")
    .replace(
      /^((re|fw|fwd|aw|automatic reply|auto(matic)? ?response|automated (reply|response)|out of office|ooo|autoreply|thank you for your email)\s*:\s*)+/gi,
      "",
    )
    .trim()
    .toLowerCase();
}

/** Whether a reply's subject is the letter's. */
export function sameSubject(reply: string, letter: string): boolean {
  const ours = plainSubject(letter);
  return ours.length > 0 && plainSubject(reply).includes(ours);
}

/** A subject that says it's an acknowledgement, beyond those isMachineReply knows, which an office's system writes. */
export function isAcknowledgement(subject: string): boolean {
  return (
    /^(automatic reply|auto(matic)?[ -]?(reply|response)|automated (reply|response)|out of office|ooo\b|autoreply)/i.test(
      subject,
    ) ||
    /^(thank you for (contacting|your email|getting in touch|emailing)|thanks for (contacting|your email)|acknowledg)/i.test(
      subject,
    ) ||
    /automatic reply|automated response|out of office/i.test(subject)
  );
}
