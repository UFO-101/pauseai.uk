import "server-only";
import type { ContactPermission } from "@/lib/contact-permissions";
import { staffCopy } from "@/lib/content/staff-interface";
import { localGroups } from "@/lib/content/local-groups";
import type { MailingChoice } from "@/lib/mailing-fields";
import type { MailingRecipientValues } from "@/lib/mailing-doc";
import { supportersSearch, type StoredFilter } from "@/lib/staff-search";
import {
  hasField,
  MEMBER_CONDITION,
  MESSAGE_FIELDS,
  VOLUNTEER_CONDITION,
  type MessageTerms,
} from "@/lib/supporter-messages";
import type { SupporterRow } from "@/lib/supporters";
import { query } from "./db";
import { listSupporters, MP_CHOICES } from "./supporters";

// Who a message to supporters goes to: everyone the supporters list's filter
// finds, of whom those contact_permission() says yes for, by the message's
// channel and topic. The list and the permissions are read when asked, so a
// stop made since the draft was opened counts.

const copy = staffCopy.messagePages;

/** A supporter a message goes to: where, and what it's filled in with. */
export type SupporterRecipient = MailingRecipientValues & {
  id: number;
  name: string;
  /** Their email address, or number, that said yes. */
  address: string;
  place: string | null;
};

/** Someone the filter finds whom a message can't go to, and why: no yes for this topic, a stop, or a blocked address. */
export type MessageLeftOutReason = "no-permission" | "stopped" | "blocked";
export type MessageLeftOut = { id: number; name: string; reason: MessageLeftOutReason };

export type SupporterAudience = {
  recipients: SupporterRecipient[];
  leftOut: MessageLeftOut[];
  /** The merge fields, with how many recipients lack a value for each and get its fallback. */
  fields: MailingChoice[];
  /** What a part can be only for, with how many recipients each covers. */
  conditions: MailingChoice[];
};

/** The name of the local group a place is in, by the words that mark the group's own events; or none. */
export function localGroupOf(place: string | null | undefined): string | null {
  if (!place) return null;
  const words = place.toLowerCase();
  const group = localGroups.find((one) => one.eventMatchers.some((matcher) => words.includes(matcher.toLowerCase())));
  return group ? copy.localGroupName(group.name) : null;
}

/** Each postcode's MP, in office for its constituency, by the postcode as postcode_places has it. */
async function mpsByPostcode(postcodes: string[]): Promise<Map<string, string>> {
  const rows = await query<{ postcode: string; name: string }>(
    `SELECT pp.postcode, m.name FROM postcode_places pp JOIN (${MP_CHOICES}) m ON m.constituency = pp.constituency
     WHERE pp.postcode = ANY($1::text[])`,
    [postcodes.map(postcodeKey)],
  );
  return new Map(rows.map((row) => [row.postcode, row.name]));
}

const postcodeKey = (postcode: string) => postcode.replace(/ /g, "").toUpperCase();

/** Why none of someone's addresses can be used: a stop or a block outranks never having said yes. */
function whyLeftOut(answers: ContactPermission[]): MessageLeftOutReason {
  if (answers.some((answer) => answer.reason === "blocked")) return "blocked";
  const stops = ["unsubscribed", "removed", "ended"];
  return answers.some((answer) => stops.includes(answer.reason)) ? "stopped" : "no-permission";
}

/** A supporter's merge values, each field's fallback for those without it, and the conditions they meet. */
function recipientValues(row: SupporterRow, mp: string | undefined): MailingRecipientValues {
  const given: Record<(typeof MESSAGE_FIELDS)[number], string | null | undefined> = {
    firstName: row.name?.trim().split(/\s+/)[0],
    localGroup: localGroupOf(row.place?.name),
    mp,
  };
  const volunteers = row.permissions.some((answer) => answer.reason === "volunteered");
  return {
    values: Object.fromEntries(MESSAGE_FIELDS.map((field) => [field, given[field] || copy.fallbacks[field]])),
    meets: [
      ...MESSAGE_FIELDS.filter((field) => given[field]).map(hasField),
      ...(volunteers ? [VOLUNTEER_CONDITION] : []),
      ...(row.member ? [MEMBER_CONDITION] : []),
    ],
  };
}

/** Who a message with this filter, channel and topic goes to and who it leaves out, and what its words can use. */
export async function supporterAudience(filter: StoredFilter, terms: MessageTerms): Promise<SupporterAudience> {
  const { supporters } = await listSupporters(supportersSearch(filter.params).filter, null);
  const mps = await mpsByPostcode(supporters.flatMap((row) => row.postcode ?? []));
  const channel = terms.channel === "email" ? "email" : "phone";
  const recipients: SupporterRecipient[] = [];
  const leftOut: MessageLeftOut[] = [];
  for (const row of supporters) {
    const name = row.name || staffCopy.supporters.noName;
    const answers = row.permissions.filter((one) => one.channel === channel && one.topic === terms.topic);
    const yes = answers.find((answer) => answer.send === "yes");
    if (!yes) {
      leftOut.push({ id: row.id, name, reason: whyLeftOut(answers) });
      continue;
    }
    const values = recipientValues(row, row.postcode ? mps.get(postcodeKey(row.postcode)) : undefined);
    recipients.push({ id: row.id, name, address: yes.address, place: row.place?.name ?? null, ...values });
  }
  const covering = (id: string) => recipients.filter((recipient) => recipient.meets.includes(id)).length;
  const conditionCopy = copy.conditions;
  return {
    recipients,
    leftOut,
    fields: MESSAGE_FIELDS.map((id) => ({
      id,
      label: copy.fields[id],
      lacking: recipients.length - covering(hasField(id)),
      fallback: true,
    })),
    conditions: [
      { id: hasField("localGroup"), ...conditionCopy.localGroup },
      { id: hasField("mp"), ...conditionCopy.mp },
      { id: VOLUNTEER_CONDITION, ...conditionCopy.volunteer },
      { id: MEMBER_CONDITION, ...conditionCopy.member },
    ].map((condition) => ({ ...condition, covers: covering(condition.id) })),
  };
}
