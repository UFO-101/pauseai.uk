import "server-only";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { copy } from "@/lib/content/email-your-mp";
import { campaignBySlug, fullLetter, looksLikeEmail, signatureAddress } from "@/lib/email-your-mp";
import { query, transaction, type Queryable } from "./db";
import { findMp } from "./find-mp";
import { headerName, sendEmail } from "./postmark";
import { checkNotSpam } from "./turnstile";

// A letter from the form, sent through Postmark from the letter's own
// address as soon as the form is accepted (plans/email-your-mp-v2.md).

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

async function logEvent(letterId: number, status: string, details: object, db?: Queryable): Promise<void> {
  await query("INSERT INTO letter_events (letter_id, status, details) VALUES ($1, $2, $3)", [letterId, status, JSON.stringify(details)], db);
}

function fail(status: number, message: string): SubmitResult {
  return { ok: false, status, message };
}

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

/**
 * Checks a letter and sends it to the MP straight away. Each sender email
 * gets one letter per campaign, except to the test MPs, so they can be tried
 * again and again. If Postmark refuses it, nothing is kept, so the sender
 * can try again.
 */
export async function submitLetter(form: LetterForm, hostname: string): Promise<SubmitResult> {
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
  const mp = found.ok ? found.mp : undefined;
  const to = mp?.email;
  if (!mp || !to) return fail(400, copy.errors.noRecipient);
  if (!mayWriteTo(mp)) return fail(403, copy.errors.testMpOnly);

  const body = fullLetter(form.letter, form.name, signatureAddress(form.address, form.postcode));
  const replyHash = randomBytes(12).toString("hex");
  let id: number | undefined;
  try {
    id = await transaction(async (db) => {
      // Locks out a second request from the same address until this one is saved.
      await query("SELECT pg_advisory_xact_lock(hashtext(lower($1)))", [form.email], db);
      if (!mp.isTest) {
        const [{ count }] = await query<{ count: number }>(
          `SELECT count(*)::int AS count FROM letters l JOIN politicians p ON p.id = l.politician_id
           WHERE lower(l.sender_email) = lower($1) AND l.campaign = $2 AND NOT p.is_test`,
          [form.email, campaign.slug],
          db,
        );
        if (count > 0) return undefined;
      }
      const [{ id }] = await query<{ id: number }>(
        `INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode,
           contact_consent, subject, body, reply_hash, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'sending') RETURNING id::int AS id`,
        [campaign.slug, mp.id, form.name, form.email, form.address, form.postcode.toUpperCase(), form.consent, form.subject, body, replyHash],
        db,
      );
      await logEvent(id, "sending", {}, db);
      return id;
    });
    if (id === undefined) return fail(409, copy.errors.alreadySent);

    const address = letterAddress(replyHash);
    const messageId = await sendEmail({
      From: `"${headerName(form.name)} via PauseAI" <${address}>`,
      To: to,
      ReplyTo: `${form.email}, ${address}`,
      Subject: form.subject,
      TextBody: body,
      Attachments: await attachments(campaign.slug),
      Metadata: { letter: String(id), campaign: campaign.slug },
      Tag: campaign.slug,
    });
    await query("UPDATE letters SET status = 'sent', postmark_message_id = $2, sent_at = now() WHERE id = $1", [id, messageId]);
    await logEvent(id, "sent", { messageId });
    return { ok: true };
  } catch (error) {
    console.error(`Couldn't send letter ${id ?? "(not saved)"}:`, error);
    if (id !== undefined) await query("DELETE FROM letters WHERE id = $1", [id]);
    return fail(500, copy.errors.failed);
  }
}
