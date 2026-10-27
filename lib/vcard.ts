// A staff list's people as a vCard file (RFC 6350's version 3.0, which
// phones, and WhatsApp Business through them, import): a card each, every
// name starting "PauseAI <code> - ", the same code for the whole file, so
// one search on a phone finds everyone one download added.
import { defaultRandom } from "./shuffle";

/** What a card says of someone: the standard fields we have something for. */
export type Contact = {
  /** As we know them; a card with none is named by their email. */
  name: string | null;
  emails: string[];
  phones: string[];
  /** Where they are: a town, a postcode, a nation. */
  address?: { locality?: string | null; postcode?: string | null; country?: string | null };
  /** What they do: a house, a party, a role. */
  org?: string | null;
  title?: string | null;
  /** Everything else we know, a line each. */
  note?: string[];
  /** Their page in the staff interface. */
  url?: string;
};

/** Letters and digits that don't look like each other: no 0 or O, no 1, I or L. */
const CODE_LETTERS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** A short random code for a download's cards: four letters and digits, about 900,000 of them. The same in every fixture build (lib/shuffle.ts). */
export function vcardCode(random: () => number = defaultRandom()): string {
  return Array.from({ length: 4 }, () => CODE_LETTERS[Math.floor(random() * CODE_LETTERS.length)]).join("");
}

/** A value in a card, its backslashes, commas, semicolons and line breaks escaped. */
function escape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\r?\n/g, "\\n");
}

/** A line of a card, folded at 75 bytes as the standard asks: each further line starts with a space. */
function fold(line: string): string {
  const parts: string[] = [];
  let part = "";
  for (const char of line) {
    if (new TextEncoder().encode(part + char).length > (parts.length ? 74 : 75)) {
      parts.push(part);
      part = "";
    }
    part += char;
  }
  parts.push(part);
  return parts.join("\r\n ");
}

/** One card, named "PauseAI <code> - <name>", and its URL made absolute against `origin`. */
function card(contact: Contact, code: string, origin: string): string {
  const name = `PauseAI ${code} - ${contact.name || contact.emails[0] || ""}`.trim();
  const { address } = contact;
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escape(name)}`,
    // All of it as the given name, so every phone shows the name as it is.
    `N:;${escape(name)};;;`,
    ...contact.emails.map((email, i) => `EMAIL;TYPE=INTERNET${i === 0 ? ",PREF" : ""}:${escape(email)}`),
    ...contact.phones.map((phone, i) => `TEL;TYPE=CELL${i === 0 ? ",PREF" : ""}:${escape(phone)}`),
    ...(address && (address.locality || address.postcode || address.country)
      ? [
          `ADR;TYPE=HOME:;;;${escape(address.locality ?? "")};;${escape(address.postcode ?? "")};${escape(address.country ?? "")}`,
        ]
      : []),
    ...(contact.org ? [`ORG:${escape(contact.org)}`] : []),
    ...(contact.title ? [`TITLE:${escape(contact.title)}`] : []),
    ...(contact.note?.length ? [`NOTE:${escape(contact.note.join("\n"))}`] : []),
    ...(contact.url ? [`URL:${new URL(contact.url, origin)}`] : []),
    "CATEGORIES:PauseAI",
    "END:VCARD",
  ];
  return lines.map(fold).join("\r\n");
}

/** Every contact as a card, in one file, named with `code`; links on the site at `origin`. */
export function vcardFile(contacts: Contact[], code: string, origin: string): string {
  return contacts.map((contact) => card(contact, code, origin)).join("\r\n") + "\r\n";
}
