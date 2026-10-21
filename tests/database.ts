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
 * Options for a test that makes or drops databases itself, in psql. Under a
 * second alone, but over 6s has been seen while every other test file makes
 * its database on a loaded machine, past the 5s default.
 */
export const MAKES_DATABASES = { timeout: 30_000 };

const TABLES = [
  "audit_log",
  "campaign_statuses",
  "email_blocks",
  "email_problems",
  "email_sends",
  "import_runs",
  "letter_events",
  "letters",
  "opt_outs",
  "politicians",
  "staff_login_links",
  "staff_sessions",
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
  sitting?: boolean;
};

/** Adds a politician straight into the table, and returns their ID. */
export async function addTestPolitician(row: MpRow = {}): Promise<number> {
  const [{ id }] = await query<{ id: number }>(
    `INSERT INTO politicians (airtable_id, house, name, salutation, constituency, party, email, is_test, test_postcode, sitting)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id::int AS id`,
    [
      row.airtableId === undefined ? "recPlaceholder" : row.airtableId,
      row.house ?? "commons",
      row.name ?? "Polly Placeholder",
      row.salutation ?? "Ms Placeholder",
      row.constituency === undefined ? "Cities of London and Westminster" : row.constituency,
      row.party ?? "Labour (Co-op)",
      row.email === undefined ? "polly.placeholder.mp@parliament.uk" : row.email,
      row.testPostcode !== undefined,
      row.testPostcode ?? null,
      row.sitting ?? true,
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
