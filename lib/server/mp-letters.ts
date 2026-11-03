import "server-only";
import { copy } from "@/lib/content/email-your-mp";
import { campaignBySlug, draftLetter, looksLikeEmail, signatureAddress } from "@/lib/email-your-mp";
import { draftHash, ownWords } from "@/lib/letter-changes";
import { checkDoc, isBlank, toText, type LetterDoc } from "@/lib/letter-format";
import { query, transaction } from "./db";
import { findMp } from "./find-mp";
import { sendLetter, type QueueReason } from "./letter-sending";
import { isLettersInboxAddress } from "./letters-inbox";
import { checkNotSpam } from "./outside-services/turnstile";
import { statusesOf } from "./politicians";
import { politicianProxy, supporterProxy } from "./proxies";
import { linkSupporters } from "./supporters";

// A letter from the form: checked, kept, then sent from the letters inbox
// at once if it can be (lib/server/letter-sending.ts), else queued.

export type LetterForm = {
  campaign: string;
  name: string;
  postcode: string;
  address: string;
  email: string;
  subject: string;
  /** The editor's document, if it holds only what a letter may. */
  letter: LetterDoc | undefined;
  /** The hash of the draft the form began with (draftHash), to tell whether the server's rebuild of it is the same. */
  draftHash: string;
  consent: boolean;
  nickname: string;
  turnstileToken: string;
};

/** Kept, and sent, or queued and why; or refused, with the status and message to answer with. */
export type SubmitResult = { ok: true; queued?: QueueReason } | { ok: false; status: number; message: string };

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
    letter: checkDoc(data.letter),
    draftHash: text(data.draftHash),
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

function fail(status: number, message: string): SubmitResult {
  return { ok: false, status, message };
}

/** Whether `email` is one of ours, which a sender can't give: the letters inbox's, a proxy, or the policy team's. */
function isOurAddress(email: string): boolean {
  const policy = process.env.POLICY_INBOX?.trim().toLowerCase();
  return isLettersInboxAddress(email) || (!!policy && email.trim().toLowerCase() === policy);
}

/**
 * Checks a letter, keeps it, queued, and tries to send it at once. Each
 * sender email gets one letter per campaign, except to the test MPs, so
 * they can be tried again and again. Once kept it's never deleted for
 * failing to send: what stops it waits in the queue, with its reason
 * (lib/server/letter-sending.ts), and the result says so.
 */
export async function submitLetter(form: LetterForm): Promise<SubmitResult> {
  const spam = await checkNotSpam(form);
  if (spam.drop) return { ok: true };
  if (spam.message) return fail(403, spam.message);

  if (
    !form.name ||
    !form.postcode ||
    !form.address ||
    !form.email ||
    !form.subject ||
    !form.letter ||
    isBlank(form.letter)
  ) {
    return fail(400, copy.errors.missingFields);
  }
  if (!looksLikeEmail(form.email)) return fail(400, copy.errors.invalidEmail);
  if (isOurAddress(form.email)) return fail(400, copy.errors.ourAddress);
  const campaign = campaignBySlug(form.campaign);
  if (!campaign) return fail(400, copy.errors.unknownCampaign);

  const found = await findMp(form.postcode);
  const mp = found.ok ? found.mp : undefined;
  if (!mp?.email) return fail(400, copy.errors.noRecipient);
  if (!mayWriteTo(mp)) return fail(403, copy.errors.testMpOnly);

  // The draft the form began with, rebuilt as it made it, and what the sender changed.
  const draft = toText(
    draftLetter(
      campaign,
      {
        salutation: mp.salutation,
        constituency: mp.constituency,
        senderName: form.name,
        statuses: await statusesOf(mp.id),
      },
      signatureAddress(form.address, form.postcode),
    ),
  );
  const letter = form.letter;
  let id: number | undefined;
  try {
    id = await transaction(async (db) => {
      // Locks out a second request from the same address until this one is saved.
      await query("SELECT pg_advisory_xact_lock(hashtext(lower($1)))", [form.email], db);
      if (!mp.isTest) {
        const [{ count }] = await query<{ count: number }>(
          `SELECT count(*)::int AS count FROM letters_from_supporters s JOIN letters l ON l.id = s.id
             JOIN form_entries f ON f.id = s.entry_id JOIN politicians p ON p.id = l.notable_person_id
           WHERE lower(trim(f.email)) = lower(trim($1)) AND s.campaign = $2 AND NOT p.is_test AND l.status <> 'not_sent'`,
          [form.email, campaign.slug],
          db,
        );
        if (count > 0) return undefined;
      }
      const [{ id }] = await query<{ id: number }>(
        `INSERT INTO letters (kind, notable_person_id, status) VALUES ('supporter', $1, 'queued') RETURNING id::int AS id`,
        [mp.id],
        db,
      );
      const [entry] = await query<{ id: number }>(
        `INSERT INTO form_entries (form, name, email, address, postcode, contact_consent)
         VALUES ('email-your-mp', $1, $2, $3, $4, $5) RETURNING id::int AS id`,
        [form.name, form.email, form.address, form.postcode.toUpperCase(), form.consent],
        db,
      );
      const proxy = await supporterProxy(form.email, form.name, db);
      await politicianProxy(mp, db);
      await query(
        `INSERT INTO letters_from_supporters (id, entry_id, campaign, subject, proxy_id, letter, draft, draft_approximate,
           own_words, copy_state)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'queued')`,
        [
          id,
          entry.id,
          campaign.slug,
          form.subject,
          proxy.id,
          JSON.stringify(letter),
          draft,
          draftHash(draft) !== form.draftHash,
          ownWords(draft, toText(letter)),
        ],
        db,
      );
      await linkSupporters(db);
      return id;
    });
  } catch (error) {
    console.error("Couldn't keep a letter:", error);
    return fail(500, copy.errors.failed);
  }
  if (id === undefined) return fail(409, copy.errors.alreadySent);
  const sent = await sendLetter(id);
  return sent.sent ? { ok: true } : { ok: true, queued: sent.reason };
}
