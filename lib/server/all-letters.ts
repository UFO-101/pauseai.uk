import "server-only";
import { now } from "@/lib/now";
import { mailboxes } from "@/lib/email-parsing/addresses";
import { isAtPauseai, PARLIAMENT_DOMAINS, politicianAddresses, type PoliticianBook } from "@/lib/one-off";
import { windowStart } from "@/lib/staff-dashboard";
import { ALL_LETTERS_PAGE_SIZE, type AllLettersFilter } from "@/lib/staff-search";
import { query } from "./db";
import { threadsWithSomeoneElse } from "./one-off-emails";
import { politicianBook } from "./politician-book";

// The all emails page: every email with a politician, a row for each letter, a
// supporter's or from one of PauseAI's mailings, and for each one-off thread.
// Those to test MPs are left out, as the dashboard's tiles leave them out too.

type AnyLetterBase = {
  id: number;
  status: string;
  sentAt: string | null;
  repliedAt: string | null;
};

/** One who a letter or thread is with. */
export type EmailPerson = { id: number; name: string };

/** One a thread's first message was to. */
export type EmailRecipient = { name: string; politicianId: number | null; pauseai: boolean };

/** A row of the all emails page: a supporter's letter, with its campaign; PauseAI's, with its mailing; or a one-off thread. */
export type AnyLetter = AnyLetterBase &
  (
    | {
        kind: "supporter";
        people: EmailPerson[];
        senderName: string;
        senderEmail: string;
        supporterId: number | null;
        campaign: string;
        campaignTitle: string;
      }
    | { kind: "pauseai"; people: EmailPerson[]; mailingId: number; mailingTitle: string }
    | {
        kind: "one-off";
        people: EmailPerson[];
        senderName: string;
        senderEmail: string;
        /** Whether its first message is from one of PauseAI's addresses. */
        fromUs: boolean;
        /** Who its first message was to: PauseAI once, and each other by name, a politician with their ID. */
        recipients: EmailRecipient[];
        subject: string;
      }
  );

export type AllLettersFound = { letters: AnyLetter[]; total: number; pages: number };

/** Parliaments' domains and any subdomain of them, as a regular expression over an address. */
const PARLIAMENT_ADDRESS = `@(.+\\.)?(${PARLIAMENT_DOMAINS.join("|").replace(/\./g, "\\.")})$`;

/** Those on a To line: PauseAI once, however many of us, first; each other by name, or address with none. */
function recipientsOf(line: string, book: PoliticianBook): EmailRecipient[] {
  const people = mailboxes(line);
  const politicians = politicianAddresses(
    book,
    people.map((person) => person.address),
  );
  const others = people.filter((person) => !isAtPauseai(person.address));
  return [
    ...(others.length < people.length ? [{ name: "", politicianId: null, pauseai: true }] : []),
    ...others.map(({ name, address }) => ({
      name: name || address,
      politicianId: politicians[address] ?? null,
      pauseai: false,
    })),
  ];
}

/** Whether an address is a politician's, its values the first three of the query's: as lib/one-off.ts tells, in SQL. */
const FROM_POLITICIAN = (address: string) =>
  `(${address} = ANY($1) OR split_part(${address}, '@', 2) = ANY($2) OR ${address} ~ $3)`;

/** A row's type, as EMAIL_TYPES. */
const TYPE_OF = "CASE e.kind WHEN 'supporter' THEN 'campaign' WHEN 'pauseai' THEN 'mailing' ELSE 'one-off' END";

/** A politician the To filter offers. */
export type EmailChoice = { id: number; name: string; constituency: string | null };

/**
 * Every politician with an email on the page, for the To filter, by name, but
 * test MPs; without `supporters`, only among the emails those staff can see.
 */
export async function emailPeople(supporters: boolean): Promise<EmailChoice[]> {
  const hidden = supporters ? [] : await threadsWithSomeoneElse();
  return query<EmailChoice>(
    `SELECT n.id::int AS id, n.name, p.constituency FROM notable_people n JOIN politicians p ON p.id = n.id
     WHERE NOT p.is_test AND (
       EXISTS (SELECT 1 FROM letters l WHERE l.notable_person_id = n.id AND ($1 OR l.kind <> 'supporter'))
       OR EXISTS (SELECT 1 FROM one_off_thread_people tp JOIN one_off_threads t ON t.id = tp.thread_id
         WHERE tp.notable_person_id = n.id AND NOT t.id = ANY($2::bigint[])))
     ORDER BY n.name, n.id`,
    [supporters, hidden],
  );
}

/**
 * One page of what `filter` finds, newest sent first with those not sent last,
 * and how many it finds in all. Without `supporters`, what would show a
 * supporter is left out unseen: their letters and one-off threads with someone
 * else on them (threadsWithSomeoneElse). A thread counts as sent, by whoever sent it, at its first message,
 * and replied to at the first message after that from a politician (lib/one-off.ts).
 */
export async function listAllLetters(filter: AllLettersFilter, supporters: boolean): Promise<AllLettersFound> {
  const book = await politicianBook();
  const hidden = supporters ? [] : await threadsWithSomeoneElse();
  const values: unknown[] = [[...book.addresses.keys()], [...book.domains.keys()], PARLIAMENT_ADDRESS, hidden];
  const add = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  const where = supporters ? [] : ["e.kind <> 'supporter' AND NOT e.someone_else"];
  if (filter.search) {
    const like = add(`%${filter.search}%`);
    where.push(`(e.sender_name ILIKE ${like} OR e.sender_email ILIKE ${like} OR e.about ILIKE ${like}
      OR EXISTS (SELECT 1 FROM json_array_elements(e.people) person WHERE person->>'name' ILIKE ${like}))`);
  }
  if (filter.from) where.push(`e.sender = ANY(${add(filter.from)})`);
  if (filter.notFrom) where.push(`e.sender <> ALL(${add(filter.notFrom)})`);
  if (filter.type) where.push(`${TYPE_OF} = ANY(${add(filter.type)})`);
  if (filter.notType) where.push(`${TYPE_OF} <> ALL(${add(filter.notType)})`);
  const isWith = (ids: number[]) =>
    `EXISTS (SELECT 1 FROM json_array_elements(e.people) person WHERE (person->>'id')::bigint = ANY(${add(ids)}))`;
  if (filter.to) where.push(isWith(filter.to));
  if (filter.notTo) where.push(`NOT ${isWith(filter.notTo)}`);
  if (filter.sentDays) {
    where.push(`e.sent_at >= ${add(windowStart(filter.sentDays))} AND e.sent_at <= ${add(now())}`);
  }
  if (filter.replied === "yes") where.push("e.replied_at IS NOT NULL");
  else if (filter.replied === "no") where.push("e.replied_at IS NULL");
  else if (filter.replied) {
    where.push(`e.replied_at >= ${add(windowStart(filter.replied))} AND e.replied_at <= ${add(now())}`);
  }
  const emails = `(
    SELECT l.id, l.kind, l.status, l.sent_at, l.replied_at, false AS someone_else,
      json_build_array(json_build_object('id', n.id::int, 'name', n.name)) AS people,
      f.name AS sender_name, f.email AS sender_email, coalesce(c.title, m.title) AS about,
      s.campaign, (SELECT k.supporter_id::int FROM supporter_links k WHERE k.form_entry_id = s.entry_id) AS supporter_id,
      m.id AS mailing_id, false AS from_us, l.kind AS sender, NULL AS to_line
    FROM letters l JOIN politicians p ON p.id = l.notable_person_id JOIN notable_people n ON n.id = p.id
      LEFT JOIN letters_from_supporters s ON s.id = l.id LEFT JOIN form_entries f ON f.id = s.entry_id
      LEFT JOIN campaigns c ON c.slug = s.campaign
      LEFT JOIN letters_from_pauseai lp ON lp.id = l.id LEFT JOIN mailings m ON m.id = lp.mailing_id
    WHERE NOT p.is_test
    UNION ALL
    SELECT t.id, 'one-off', 'one-off', first.at,
      (SELECT min(m.at) FROM one_off_messages m WHERE m.thread_id = t.id AND m.at > first.at
         AND ${FROM_POLITICIAN("m.from_address")}),
      t.id = ANY($4::bigint[]),
      coalesce((SELECT json_agg(json_build_object('id', n.id::int, 'name', n.name) ORDER BY n.name)
        FROM one_off_thread_people tp JOIN notable_people n ON n.id = tp.notable_person_id
        WHERE tp.thread_id = t.id), '[]'),
      first.from_name, first.from_address, t.subject, NULL, NULL, NULL, first.from_us,
      CASE WHEN first.from_us THEN 'pauseai' WHEN ${FROM_POLITICIAN("first.from_address")} THEN 'politician'
        WHEN EXISTS (SELECT 1 FROM supporter_identity i WHERE i.email = first.from_address) THEN 'supporter'
        ELSE 'other' END,
      first.to_line
    FROM one_off_threads t
      CROSS JOIN LATERAL (SELECT m.at, m.from_name, m.from_address, m.from_us, m.to_line FROM one_off_messages m
        WHERE m.thread_id = t.id ORDER BY m.at, m.id LIMIT 1) first
    WHERE NOT EXISTS (SELECT 1 FROM one_off_thread_people tp JOIN politicians p ON p.id = tp.notable_person_id
      WHERE tp.thread_id = t.id AND p.is_test)
  ) e`;
  const found = `FROM ${emails} ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`;
  const [{ total }] = await query<{ total: number }>(`SELECT count(*)::int AS total ${found}`, values);
  const rows = await query<AnyLetter & { toLine: string | null }>(
    `SELECT e.id::int AS id, e.kind, e.status, e.sent_at AS "sentAt", e.replied_at AS "repliedAt", e.people,
       e.sender_name AS "senderName", e.sender_email AS "senderEmail", e.campaign, e.about AS "campaignTitle",
       e.about AS "mailingTitle", e.about AS subject, e.supporter_id AS "supporterId", e.mailing_id::int AS "mailingId", e.from_us AS "fromUs", e.to_line AS "toLine"
     ${found}
     ORDER BY e.sent_at DESC NULLS LAST, e.id DESC
     LIMIT ${add(ALL_LETTERS_PAGE_SIZE)} OFFSET ${add((filter.page - 1) * ALL_LETTERS_PAGE_SIZE)}`,
    values,
  );
  const letters = rows.map(({ toLine, ...row }) =>
    row.kind === "one-off" ? { ...row, recipients: recipientsOf(toLine!, book) } : row,
  ) as AnyLetter[];
  return { letters, total, pages: Math.max(1, Math.ceil(total / ALL_LETTERS_PAGE_SIZE)) };
}
