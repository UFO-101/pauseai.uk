import "server-only";
import { outsideFetch } from "./outside-fetch";

// Logs each sent letter in CiviCRM as an activity on the sender's contact,
// through CiviCRM's standard APIv4 REST interface:
//   POST <CIVICRM_URL>/civicrm/ajax/api4/<Entity>/<action>, params=<JSON>
// authenticated with an API key (X-Civi-Auth: Bearer <key>).
//
// The URL, key and activity type are settings, since none is known yet.
// Without them nothing is logged. A failure here never stops a letter.

type Settings = { url: string; key: string; activityType: string };

function settings(): Settings | undefined {
  const url = process.env.CIVICRM_URL?.replace(/\/+$/, "");
  const key = process.env.CIVICRM_API_KEY;
  const activityType = process.env.CIVICRM_ACTIVITY_TYPE;
  return url && key && activityType ? { url, key, activityType } : undefined;
}

async function api4(s: Settings, entity: string, action: string, params: object): Promise<Record<string, unknown>[]> {
  const res = await outsideFetch(`${s.url}/civicrm/ajax/api4/${entity}/${action}`, {
    method: "POST",
    headers: {
      "X-Civi-Auth": `Bearer ${s.key}`,
      "X-Requested-With": "XMLHttpRequest",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ params: JSON.stringify(params) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !Array.isArray(data.values)) throw new Error(`CiviCRM ${entity}.${action} failed: ${res.status} ${data.error_message ?? ""}`.trim());
  return data.values;
}

/** The contact with this email, made if there isn't one. */
async function contactFor(s: Settings, name: string, email: string): Promise<number> {
  const [found] = await api4(s, "Email", "get", { select: ["contact_id"], where: [["email", "=", email]], limit: 1 });
  if (found) return Number(found.contact_id);
  const [first, ...rest] = name.split(/\s+/);
  const [made] = await api4(s, "Contact", "create", {
    values: { contact_type: "Individual", first_name: first, last_name: rest.join(" ") },
    chain: { email: ["Email", "create", { values: { contact_id: "$id", email, is_primary: true } }] },
  });
  return Number(made.id);
}

export type SentLetter = {
  id: number;
  campaign: string;
  senderName: string;
  senderEmail: string;
  contactConsent: boolean;
  subject: string;
  mpName: string;
  mpEmail: string;
};

/** Records a sent letter as a completed activity. Returns whether it did. */
export async function logLetterSent(letter: SentLetter): Promise<boolean> {
  const s = settings();
  if (!s) return false;
  try {
    const contactId = await contactFor(s, letter.senderName, letter.senderEmail);
    await api4(s, "Activity", "create", {
      values: {
        "activity_type_id:name": s.activityType,
        "status_id:name": "Completed",
        source_contact_id: contactId,
        target_contact_id: [contactId],
        subject: `${letter.subject} (to ${letter.mpName})`,
        details: [
          `Campaign: ${letter.campaign}`,
          `MP: ${letter.mpName} <${letter.mpEmail}>`,
          `Contact consent: ${letter.contactConsent ? "yes" : "no"}`,
          `Letter ID: ${letter.id}`,
        ].join("\n"),
      },
    });
    return true;
  } catch (error) {
    console.error(`Couldn't log letter ${letter.id} in CiviCRM:`, error);
    return false;
  }
}
