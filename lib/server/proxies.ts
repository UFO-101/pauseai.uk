import "server-only";
import { query, type Queryable } from "./db";
import { proxyAddress } from "./letters-inbox";
import { headerName } from "./outside-services/postmark";

// Proxies: the plus addresses on the letters inbox that a supporter and
// their MP see each other as (lib/server/letters-inbox.ts). Each has a tag,
// named once from a name and kept: a supporter's from the name on their
// first letter, keyed by their email address, as casework systems file
// constituents by it; an MP's the first time they're written to, kept if
// their name or address changes. Tags are easy to guess, which is harmless:
// only authenticated mail from a letter's two parties is relayed.

/** Letters that are still not ASCII once accents are taken off, and how to spell them. */
const SPELLINGS: Record<string, string> = {
  ß: "ss",
  æ: "ae",
  ø: "o",
  œ: "oe",
  ł: "l",
  đ: "d",
  ð: "d",
  þ: "th",
  ı: "i",
};

/**
 * A name as the start of an email address: lowercase ASCII words joined by
 * dots ("Zoë O'Brien-Smith" is zoe.obrien.smith), at most 30 characters,
 * or "letter" when none of it is Latin script.
 */
export function mailboxName(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[ßæøœłđðþı]/g, (letter) => SPELLINGS[letter])
      .replace(/['’]/g, "")
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .join(".")
      .slice(0, 30)
      .replace(/\.$/, "") || "letter"
  );
}

/** An MP's name as their letters and proxy give it: "MP" added unless it ends with it. */
export function mpName(name: string): string {
  const clean = headerName(name);
  return /\bMP$/.test(clean) ? clean : `${clean} MP`;
}

/** A person's own address as a To, Cc or Bcc line, with their name: "Jane Smith" <jane.smith@example.com>. */
export function nameLine(name: string, address: string): string {
  return `"${headerName(name)}" <${address}>`;
}

/** A proxy as a From or To line: "Jane Smith (via PauseAI)" <letters+jane.smith@example.org>. */
export function proxyLine(name: string, tag: string): string {
  return `"${headerName(name)} (via PauseAI)" <${proxyAddress(tag)}>`;
}

/**
 * The proxy keyed by `key`, made with the first free tag from `base`
 * (`base`, then `base.2`, `base.3` and so on) if there's none yet.
 * Returns its ID and tag.
 */
async function proxyFor(
  key: { column: "supporter_email" | "notable_person_id"; value: string | number },
  base: string,
  db?: Queryable,
): Promise<{ id: number; tag: string }> {
  const find = () =>
    query<{ id: number; tag: string }>(
      `SELECT id::int AS id, tag FROM proxies WHERE ${key.column} = $1`,
      [key.value],
      db,
    );
  for (let n = 1; ; n++) {
    const [found] = await find();
    if (found) return found;
    const tag = n === 1 ? base : `${base}.${n}`;
    // A tag or key taken meanwhile, by another letter, inserts nothing: look again.
    await query(
      `INSERT INTO proxies (tag, ${key.column}) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [tag, key.value],
      db,
    );
  }
}

/** A supporter's proxy, by their email address, named from `name` if it's new. */
export function supporterProxy(email: string, name: string, db?: Queryable) {
  return proxyFor({ column: "supporter_email", value: email.trim().toLowerCase() }, mailboxName(name), db);
}

/** A politician's proxy, named from their name as an MP if it's new: meg.hillier.mp. */
export function politicianProxy(politician: { id: number; name: string }, db?: Queryable) {
  return proxyFor({ column: "notable_person_id", value: politician.id }, mailboxName(mpName(politician.name)), db);
}
