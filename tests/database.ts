// A fresh Postgres database for each test file that needs one, with the
// migrations applied (scripts/fresh-database.mjs). See docs/testing.md.
import { afterAll, beforeAll, beforeEach, describe } from "vitest";
import { closeDb, query } from "@/lib/server/db";
import { dropDatabase, freshDatabase } from "@/scripts/fresh-database.mjs";

/**
 * describe() for tests that need the database. Netlify's build runs the unit
 * tests with no Postgres, so they're skipped there; CI and local machines
 * have one, and run them.
 */
export const describeWithDatabase = describe.skipIf(process.env.NETLIFY === "true");

/**
 * Options for a test that makes or drops databases itself, in psql, or
 * applies a migration and every one after it with migrate(), slower with each
 * migration added. Under a second or two alone, but over 6s has been seen
 * while every other test file makes its database on a loaded machine, past
 * the 5s default.
 */
export const MAKES_DATABASES = { timeout: 30_000 };

const TABLES = [
  "ask_statuses",
  "audit_log",
  "email_blocks",
  "email_problems",
  "email_sends",
  "import_runs",
  "letter_events",
  "letters",
  "form_entries",
  "form_entry_luma",
  "luma_erased",
  "luma_events",
  "luma_guests",
  "luma_import_state",
  "luma_people",
  "mailing_attachments",
  "members",
  "message_events",
  "messages_to_supporters",
  "members_erased",
  "named_places",
  "notable_people",
  "opt_outs",
  "politicians",
  "postcode_places",
  "staff_login_links",
  "staff_accounts",
  "staff_sessions",
  "letters_from_supporters",
  "supporter_links",
  "supporters",
];

/**
 * Gives this test file its own database, empty before each test. Call at the
 * top of a describeWithDatabase block.
 */
export function useTestDatabase(extraTables: string[] = []) {
  const name = `test_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;
  const original = process.env.NETLIFY_DB_URL;

  beforeAll(() => {
    process.env.NETLIFY_DB_URL = freshDatabase(name);
  });
  beforeEach(async () => {
    await query(`TRUNCATE ${[...TABLES, ...extraTables].join(", ")} RESTART IDENTITY CASCADE`);
    // The mailings written here; the imported ones come with the migrations.
    await query("DELETE FROM mailings WHERE body IS NOT NULL");
    // The kept supporters list, emptied with the tables it's made from.
    await query("REFRESH MATERIALIZED VIEW supporters_list");
  });
  afterAll(async () => {
    await closeDb();
    dropDatabase(name);
    process.env.NETLIFY_DB_URL = original;
  });
}

/**
 * Gives this test file a database with only the migrations up to `upTo`
 * ("0012") applied, so a test can fill the old tables, then apply the next
 * migration with migrate() and see what it did. Returns the database's URL.
 */
export function useDatabaseUpTo(upTo: string): { url: string } {
  const name = `test_${process.pid}_upto_${upTo}`;
  const original = process.env.NETLIFY_DB_URL;
  const db = { url: "" };
  beforeAll(async () => {
    await closeDb();
    db.url = process.env.NETLIFY_DB_URL = freshDatabase(name, { upTo });
  });
  afterAll(async () => {
    await closeDb();
    dropDatabase(name);
    process.env.NETLIFY_DB_URL = original;
  });
  return db;
}

type MpRow = {
  airtableId?: string | null;
  house?: string;
  name?: string;
  salutation?: string;
  constituency?: string | null;
  party?: string;
  email?: string | null;
  /** Makes them a test MP, found by this postcode. */
  testPostcode?: string;
  status?: string;
};

/** Adds a politician straight into the tables, and returns their ID. */
export async function addTestPolitician(row: MpRow = {}): Promise<number> {
  const [{ id }] = await query<{ id: number }>(
    `INSERT INTO notable_people (kind, airtable_id, name, salutation, email, status)
     VALUES ('politician', $1, $2, $3, $4, $5) RETURNING id::int AS id`,
    [
      row.airtableId === undefined ? "recPlaceholder" : row.airtableId,
      row.name ?? "Polly Placeholder",
      row.salutation ?? "Ms Placeholder",
      row.email === undefined ? "polly.placeholder.mp@parliament.uk" : row.email,
      row.status ?? "in_office",
    ],
  );
  await query(
    `INSERT INTO politicians (id, house, constituency, party, is_test, test_postcode) VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      id,
      row.house ?? "commons",
      row.constituency === undefined ? "Cities of London and Westminster" : row.constituency,
      row.party ?? "Labour (Co-op)",
      row.testPostcode !== undefined,
      row.testPostcode ?? null,
    ],
  );
  return id;
}

/** A letter from a supporter, straight into the tables: its row, and its sender's form entry. Returns its ID. */
export async function addTestLetter(letter: {
  politicianId: number;
  campaign?: string;
  status?: string;
  senderName?: string;
  senderEmail?: string;
  senderPostcode?: string;
  contactConsent?: boolean;
  subject?: string;
  replyHash?: string;
  createdAt?: string;
  sentAt?: string | null;
  repliedAt?: string | null;
}): Promise<number> {
  const [{ id }] = await query<{ id: number }>(
    `INSERT INTO letters (kind, notable_person_id, status, created_at, sent_at, replied_at)
     VALUES ('supporter', $1, $2, coalesce($3::timestamptz, now()), $4, $5) RETURNING id::int AS id`,
    [
      letter.politicianId,
      letter.status ?? "sent",
      letter.createdAt ?? null,
      letter.sentAt ?? null,
      letter.repliedAt ?? null,
    ],
  );
  const [entry] = await query<{ id: number }>(
    `INSERT INTO form_entries (form, created_at, name, email, address, postcode, contact_consent)
     SELECT 'email-your-mp', created_at, $2, $3, '1 Example Street', $4, $5 FROM letters WHERE id = $1
     RETURNING id::int AS id`,
    [
      id,
      letter.senderName ?? "Sam Sender",
      letter.senderEmail ?? "sam@example.com",
      letter.senderPostcode ?? "SW1A 1AA",
      letter.contactConsent ?? false,
    ],
  );
  await query(
    "INSERT INTO letters_from_supporters (id, entry_id, campaign, subject, reply_hash) VALUES ($1, $2, $3, $4, $5)",
    [
      id,
      entry.id,
      letter.campaign ?? "regulate-letter-pm",
      letter.subject ?? "A letter",
      letter.replyHash ?? `reply-${id}`,
    ],
  );
  return id;
}

/** Testy McTestface MP (ZZ99ZZ), as the sync adds them, without statuses. */
export function addTestMp(email: string | null = "test-mp@example.org"): Promise<number> {
  return addTestPolitician({
    airtableId: null,
    name: "Testy McTestface MP",
    salutation: "Mr McTestface",
    constituency: "Testshire",
    party: "",
    email,
    testPostcode: "ZZ99ZZ",
  });
}

/** Runs `work` with the database unreachable, then reconnects. */
export async function withDatabaseDown<T>(work: () => Promise<T>): Promise<T> {
  const url = process.env.NETLIFY_DB_URL;
  await closeDb();
  process.env.NETLIFY_DB_URL = "postgresql://nobody@localhost/none?host=/nonexistent";
  try {
    return await work();
  } finally {
    await closeDb();
    process.env.NETLIFY_DB_URL = url;
  }
}
