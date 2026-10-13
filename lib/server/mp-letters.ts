import "server-only";
import { copy } from "@/lib/content/email-your-mp";
import { campaignBySlug, fullLetter, looksLikeEmail } from "@/lib/email-your-mp";
import { createLetterRecord, fetchParliamentarian } from "./airtable";
import { findMp } from "./find-mp";
import { checkNotSpam } from "./turnstile";

// A letter from the form. For now it goes into Airtable, whose 8am
// automation sends it with the PDFs attached (stage 1 of
// plans/email-your-mp-v2.md).

/** The Airtable Campaign option for each campaign. */
const AIRTABLE_CAMPAIGNS: Record<string, string> = {
  "letter-to-the-prime-minister": "Frontier AI letter",
  "support-the-bill": "Alex Sobel bill",
};

export type LetterForm = {
  campaign: string;
  name: string;
  postcode: string;
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
    email: text(data.email),
    subject: text(data.subject),
    letter: text(data.letter),
    consent: data.consent === true,
    nickname: text(data.nickname),
    turnstileToken: text(data.turnstileToken),
  };
}

function fail(status: number, message: string): SubmitResult {
  return { ok: false, status, message };
}

export async function submitLetter(form: LetterForm, hostname: string): Promise<SubmitResult> {
  const spam = await checkNotSpam(form, hostname);
  if (spam.drop) return { ok: true };
  if (spam.message) return fail(403, spam.message);

  if (!form.name || !form.postcode || !form.email || !form.subject || !form.letter) {
    return fail(400, copy.errors.missingFields);
  }
  if (!looksLikeEmail(form.email)) return fail(400, copy.errors.invalidEmail);
  const campaign = campaignBySlug(form.campaign);
  if (!campaign) return fail(400, copy.errors.unknownCampaign);

  const found = await findMp(form.postcode);
  if (!found.ok || !found.mp.email) return fail(400, copy.errors.noRecipient);

  const readToken = process.env.AIRTABLE_TOKEN;
  const writeToken = process.env.AIRTABLE_WRITE_API_KEY;
  if (!readToken || !writeToken) {
    console.error("AIRTABLE_TOKEN and AIRTABLE_WRITE_API_KEY are needed to send letters");
    return fail(500, copy.errors.failed);
  }
  try {
    const parliamentarian = await fetchParliamentarian(readToken, found.mp.email);
    if (!parliamentarian) {
      console.error(`No Airtable record for ${found.mp.email}`);
      return fail(500, copy.errors.failed);
    }
    await createLetterRecord(writeToken, {
      senderEmail: form.email,
      senderName: form.name,
      senderPostcode: form.postcode.toUpperCase(),
      mpRecordId: parliamentarian.recordId,
      subject: form.subject,
      message: fullLetter(form.letter, form.name, [form.postcode.toUpperCase()]),
      campaign: AIRTABLE_CAMPAIGNS[campaign.slug],
      contactConsent: form.consent,
    });
    return { ok: true };
  } catch (error) {
    console.error("Couldn't save the letter to Airtable:", error);
    return fail(500, copy.errors.failed);
  }
}
