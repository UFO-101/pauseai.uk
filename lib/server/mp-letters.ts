import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { copy } from "@/lib/content/email-your-mp";
import { campaignBySlug, fullLetter, looksLikeEmail, signatureAddress } from "@/lib/email-your-mp";
import { logLetterSent } from "./civicrm";
import { query, transaction, type Queryable } from "./db";
import { findMp } from "./find-mp";
import { headerName, sendEmail } from "./postmark";
import { checkNotSpam } from "./turnstile";

// A letter from the form: saved unconfirmed, then a link is emailed to the
// sender. Clicking it sends the letter through Postmark, from the letter's
// own address (stage 4 of plans/email-your-mp-v2.md).

/** At most this many confirmation emails a day to one address. */
export const DAILY_CONFIRMATIONS = 5;

export type LetterForm = {
  campaign: string;
  name: string;
  postcode: string;
  address: string;
  email: string;
  subject: string;
  letter: string;
  consent: boolean;
  nickname: string;
  turnstileToken: string;
};

export type SubmitResult = { ok: true } | { ok: false; status: number; message: string };

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** The form's JSON, as strings, whatever was actually sent. */
export function parseLetterForm(body: unknown): LetterForm {
  const data = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  return {
    campaign: text(data.campaign),
    name: text(data.name),
    postcode: text(data.postcode),
    address: text(data.address),
    email: text(data.email),
    subject: text(data.subject),
    letter: text(data.letter),
    consent: data.consent === true,
    nickname: text(data.nickname),
    turnstileToken: text(data.turnstileToken),
  };
}

/**
 * Whether a letter may go to this MP. Outside production (deploy previews,
 * local development) only to the test MP: previews have a copy of real data.
 * DEPLOY_CONTEXT is Netlify's CONTEXT, fixed at build time by next.config.ts.
 */
export function mayWriteTo(mp: { isTest: boolean }): boolean {
  return mp.isTest || process.env.DEPLOY_CONTEXT === "production";
}

/** The domain letters are sent from, and replies come back to. */
function mailDomain(): string {
  return process.env.MP_MAIL_DOMAIN ?? "mp.pauseai.uk";
}

/** The letter's own address: reply+<hash>@mp.pauseai.uk. */
export function letterAddress(replyHash: string): string {
  return `reply+${replyHash}@${mailDomain()}`;
}

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function logEvent(letterId: number, status: string, details: object, db?: Queryable): Promise<void> {
  await query("INSERT INTO letter_events (letter_id, status, details) VALUES ($1, $2, $3)", [letterId, status, JSON.stringify(details)], db);
}

function fail(status: number, message: string): SubmitResult {
  return { ok: false, status, message };
}

/** Checks a letter, saves it unconfirmed, and emails the sender a link to send it. */
export async function submitLetter(form: LetterForm, origin: string, hostname: string): Promise<SubmitResult> {
  const spam = await checkNotSpam(form, hostname);
  if (spam.drop) return { ok: true };
  if (spam.message) return fail(403, spam.message);

  if (!form.name || !form.postcode || !form.address || !form.email || !form.subject || !form.letter) {
    return fail(400, copy.errors.missingFields);
  }
  if (!looksLikeEmail(form.email)) return fail(400, copy.errors.invalidEmail);
  const campaign = campaignBySlug(form.campaign);
  if (!campaign) return fail(400, copy.errors.unknownCampaign);

  const found = await findMp(form.postcode);
  if (!found.ok || !found.mp.email) return fail(400, copy.errors.noRecipient);
  if (!mayWriteTo(found.mp)) return fail(403, copy.errors.testMpOnly);

  const token = randomBytes(32).toString("base64url");
  const body = fullLetter(form.letter, form.name, signatureAddress(form.address, form.postcode));
  try {
    const id = await transaction(async (db) => {
      // Locks out a second request for the same address until this one is saved.
      await query("SELECT pg_advisory_xact_lock(hashtext(lower($1)))", [form.email], db);
      const [{ count }] = await query<{ count: number }>(
        "SELECT count(*)::int AS count FROM letters WHERE lower(sender_email) = lower($1) AND created_at > now() - interval '1 day'",
        [form.email],
        db,
      );
      if (count >= DAILY_CONFIRMATIONS) return undefined;
      const [{ id }] = await query<{ id: number }>(
        `INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode,
           contact_consent, subject, body, reply_hash, token_hash, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'unconfirmed') RETURNING id::int AS id`,
        [campaign.slug, found.mp.id, form.name, form.email, form.address, form.postcode.toUpperCase(), form.consent, form.subject, body, randomBytes(12).toString("hex"), hash(token)],
        db,
      );
      await logEvent(id, "unconfirmed", {}, db);
      return id;
    });
    if (id === undefined) return fail(429, copy.errors.tooManyConfirmations);

    try {
      await sendEmail({
        From: process.env.CONFIRMATION_FROM ?? `PauseAI UK <confirm@${mailDomain()}>`,
        To: form.email,
        Subject: copy.confirmationEmail.subject,
        TextBody: copy.confirmationEmail.body(form.name, found.mp.name, `${origin}/email-your-mp-v2/confirm#${token}`),
        Tag: "confirmation",
      });
    } catch (error) {
      await query("DELETE FROM letters WHERE id = $1", [id]);
      throw error;
    }
    return { ok: true };
  } catch (error) {
    console.error("Couldn't save the letter or send its confirmation:", error);
    return fail(500, copy.errors.failed);
  }
}

type ClaimedLetter = {
  id: number;
  campaign: string;
  senderName: string;
  senderEmail: string;
  senderAddress: string;
  contactConsent: boolean;
  subject: string;
  body: string;
  replyHash: string;
  mpName: string;
  mpEmail: string | null;
  isTest: boolean;
};

async function attachments(campaignSlug: string) {
  const campaign = campaignBySlug(campaignSlug)!;
  return Promise.all(
    campaign.attachments.map(async ({ file }) => ({
      Name: file,
      Content: (await readFile(join(process.cwd(), "public", "pdfs", file))).toString("base64"),
      ContentType: "application/pdf",
    })),
  );
}

export type ConfirmResult = { ok: true; mpName: string } | { ok: false; reason: "invalid" | "failed" };

/**
 * Sends the letter whose confirmation token this is. The token works once:
 * it's cleared as the letter is claimed, and put back only if sending fails,
 * so the sender can try again.
 */
export async function confirmLetter(token: string): Promise<ConfirmResult> {
  if (!token) return { ok: false, reason: "invalid" };
  const [letter] = await query<ClaimedLetter>(
    `UPDATE letters l SET token_hash = NULL, status = 'sending'
     FROM politicians p
     WHERE l.token_hash = $1 AND l.status = 'unconfirmed' AND p.id = l.politician_id
     RETURNING l.id::int AS id, l.campaign, l.sender_name AS "senderName", l.sender_email AS "senderEmail",
       l.sender_address AS "senderAddress", l.contact_consent AS "contactConsent", l.subject, l.body,
       l.reply_hash AS "replyHash", p.name AS "mpName", p.email AS "mpEmail", p.is_test AS "isTest"`,
    [hash(token)],
  );
  if (!letter) return { ok: false, reason: "invalid" };

  const putBack = async (reason: string) => {
    await query("UPDATE letters SET token_hash = $2, status = 'unconfirmed' WHERE id = $1", [letter.id, hash(token)]);
    await logEvent(letter.id, "unconfirmed", { reason });
  };
  if (!letter.mpEmail || !mayWriteTo(letter)) {
    await putBack(letter.mpEmail ? "only the test MP outside production" : "the MP has no email");
    return { ok: false, reason: "failed" };
  }

  let messageId: string;
  try {
    const address = letterAddress(letter.replyHash);
    messageId = await sendEmail({
      From: `"${headerName(letter.senderName)} via PauseAI" <${address}>`,
      To: letter.mpEmail,
      ReplyTo: `${letter.senderEmail}, ${address}`,
      Subject: letter.subject,
      TextBody: letter.body,
      Attachments: await attachments(letter.campaign),
      Metadata: { letter: String(letter.id), campaign: letter.campaign },
      Tag: letter.campaign,
    });
  } catch (error) {
    console.error(`Couldn't send letter ${letter.id}:`, error);
    await putBack("sending failed");
    return { ok: false, reason: "failed" };
  }

  await query("UPDATE letters SET status = 'sent', postmark_message_id = $2, sent_at = now() WHERE id = $1", [letter.id, messageId]);
  await logEvent(letter.id, "sent", { messageId });
  await logLetterSent({ ...letter, mpEmail: letter.mpEmail });
  return { ok: true, mpName: letter.mpName };
}

/** Deletes letters never confirmed, after 7 days. Returns how many. */
export async function deleteUnconfirmedLetters(): Promise<number> {
  const deleted = await query("DELETE FROM letters WHERE status = 'unconfirmed' AND created_at < now() - interval '7 days' RETURNING id");
  return deleted.length;
}
