import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  addFixtureData,
  addTestMps,
  copyDatabase,
  databaseNames,
  defaultHost,
  dropDatabase,
  freshDatabase,
  isLocal,
  runSql,
  testServerUrl,
} from "./fresh-database.mjs";

describe("isLocal", () => {
  it("accepts databases on this machine, and nothing else", () => {
    for (const url of [
      "postgresql://localhost/a",
      "postgresql://127.0.0.1:5433/a",
      "postgresql://[::1]/a",
      "postgresql:///a?host=/tmp",
      "postgresql://x@localhost/a?host=%2Fvar%2Frun%2Fpostgresql",
    ]) {
      expect(isLocal(url), url).toBe(true);
    }
    for (const url of [
      "postgresql://u:p@ep-cool.eu-central-1.aws.neon.tech/neondb",
      "postgresql://localhost/a?host=db.example.org",
    ]) {
      expect(isLocal(url), url).toBe(false);
    }
  });
});

describe("defaultHost", () => {
  it("finds the first directory with the server's socket, or falls back to localhost", () => {
    const linux = mkdtempSync(join(tmpdir(), "pg-"));
    const mac = mkdtempSync(join(tmpdir(), "pg-"));
    try {
      writeFileSync(join(mac, ".s.PGSQL.5432"), "");
      expect(defaultHost("5432", [linux, mac])).toBe(mac);
      expect(defaultHost("5433", [linux, mac])).toBe("localhost");
    } finally {
      rmSync(linux, { recursive: true });
      rmSync(mac, { recursive: true });
    }
  });
});

describe("testServerUrl", () => {
  it("prefers the environment, then .env.local, reading only that line", () => {
    const dir = mkdtempSync(join(tmpdir(), "env-"));
    const file = join(dir, ".env.local");
    try {
      writeFileSync(
        file,
        'DATA_FIXTURES=1\n# TEST_DATABASE_URL=commented\n TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/postgres" \n',
      );
      expect(testServerUrl({ TEST_DATABASE_URL: "postgresql://env/x" }, file)).toBe("postgresql://env/x");
      expect(testServerUrl({}, file)).toBe("postgresql://postgres:postgres@localhost:5433/postgres");
      writeFileSync(file, "DATA_FIXTURES=1\n");
      expect(testServerUrl({}, file)).toBeUndefined();
      expect(testServerUrl({}, join(dir, "missing"))).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});

describe.skipIf(process.env.NETLIFY === "true")("copying a database", () => {
  const template = `test_${process.pid}_template`;
  const copy = `test_${process.pid}_copy`;

  // Makes, copies and drops databases in psql, so it gets MAKES_DATABASES's
  // timeout (tests/database.ts, which this file, testing what that one is
  // built on, doesn't import).
  it(
    "copies a template, runs SQL in the copy, lists and drops them, and refuses bad names",
    { timeout: 30_000 },
    () => {
      try {
        freshDatabase(template);
        runSql(template, "INSERT INTO audit_log (actor, action) VALUES ('a', 'kept')");
        copyDatabase(copy, template);
        expect(runSql(copy, "SELECT actor, action FROM audit_log")).toEqual(["a\tkept"]);
        expect(runSql(copy, "SELECT 1 WHERE false")).toEqual([]);
        expect(databaseNames(`test_${process.pid}_`)).toEqual([copy, template]);
        expect(() => copyDatabase("bad name", template)).toThrow("Bad database name: bad name");
        expect(() => runSql("x;drop", "SELECT 1")).toThrow("Bad database name");
        expect(() => databaseNames("x'")).toThrow("Bad database name");
      } finally {
        dropDatabase(copy);
        dropDatabase(template);
      }
      expect(databaseNames(`test_${process.pid}_`)).toEqual([]);
    },
  );

  it(
    "adds the test MPs and the fake data: every table filled, supporters one per email, and every dashboard number in both weeks",
    { timeout: 30_000 },
    () => {
      const name = `test_${process.pid}_fixtures`;
      try {
        const url = freshDatabase(name);
        addTestMps(url, "mp@example.org");
        addFixtureData(url);
        // Every table has rows, bar the migrations' own record.
        const tables = runSql(
          name,
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> 'schema_migrations' ORDER BY 1",
        );
        expect(tables.length).toBeGreaterThan(15);
        for (const table of tables) expect(runSql(name, `SELECT count(*) FROM ${table}`), table).not.toEqual(["0"]);
        // One supporter per email, with nothing left unlinked, and every kind of supporter among them.
        expect(runSql(name, "SELECT count(*) FROM supporters")).toEqual(
          runSql(name, "SELECT count(DISTINCT matched_value) FROM supporter_links"),
        );
        expect(
          runSql(
            name,
            "SELECT count(*) FROM luma_people p WHERE NOT EXISTS (SELECT 1 FROM supporter_links l WHERE l.luma_user_id = p.user_id)",
          ),
        ).toEqual(["0"]);
        expect(
          runSql(
            name,
            "SELECT count(*) FROM letters t WHERE NOT EXISTS (SELECT 1 FROM supporter_links l WHERE l.letter_id = t.id)",
          ),
        ).toEqual(["0"]);
        expect(
          runSql(
            name,
            "SELECT count(*) FROM members m WHERE NOT EXISTS (SELECT 1 FROM supporter_links l WHERE l.member_id = m.id)",
          ),
        ).toEqual(["0"]);
        // Sorted byte by byte, so the order is the same whatever the database's collation.
        expect(
          runSql(
            name,
            'SELECT s FROM (SELECT DISTINCT sources::text AS s FROM supporters_summary) d ORDER BY s COLLATE "C"',
          ),
        ).toEqual([
          "{letter,luma,member}",
          "{letter,luma}",
          "{letter,member}",
          "{letter}",
          "{luma,member}",
          "{luma}",
          "{member}",
        ]);
        // Letters in every state, and every kind of event about them.
        expect(runSql(name, "SELECT DISTINCT status FROM letters ORDER BY 1")).toEqual([
          "bounced",
          "not_sent",
          "sending",
          "sent",
          "spam_complaint",
        ]);
        expect(runSql(name, "SELECT DISTINCT status FROM letter_events ORDER BY 1")).toEqual([
          "auto_reply",
          "bounced",
          "not_sent",
          "replied",
          "sending",
          "sent",
          "spam_complaint",
        ]);
        expect(runSql(name, "SELECT DISTINCT kind FROM email_problems ORDER BY 1")).toEqual([
          "complaint",
          "hard",
          "soft",
        ]);
        expect(runSql(name, "SELECT DISTINCT outcome FROM email_sends ORDER BY 1")).toEqual([
          "failed",
          "refused",
          "sent",
        ]);
        // Every job's run in every state.
        expect(runSql(name, "SELECT DISTINCT job FROM import_runs ORDER BY 1")).toEqual([
          "check-mps",
          "import-controlai",
          "import-luma",
          "import-members",
          "import-signatories",
          "sync-mps",
        ]);
        // Opt-outs told by every source, and every answer to whether we'd email someone.
        expect(runSql(name, "SELECT DISTINCT list || ' ' || source FROM opt_outs ORDER BY 1")).toEqual([
          "luma-calendar luma-webhook",
        ]);
        expect(runSql(name, "SELECT DISTINCT send || ' ' || reason FROM email_permissions ORDER BY 1")).toEqual([
          "no blocked",
          "no declined",
          "no not-following",
          "no removed",
          "no unsubscribed",
          "unsure asked",
          "unsure following",
          "unsure joined",
          "yes asked",
          "yes following",
        ]);
        expect(runSql(name, "SELECT DISTINCT status FROM import_runs ORDER BY 1")).toEqual([
          "applied",
          "discarded",
          "failed",
          "held",
          "ok",
          "unchanged",
        ]);
        expect(
          runSql(name, "SELECT DISTINCT result->>'stoppedBy' FROM import_runs WHERE result ? 'stoppedBy' ORDER BY 1"),
        ).toEqual(["rate-limit", "running", "time"]);
        // The audit log's entries about politicians name their rows.
        expect(
          runSql(
            name,
            "SELECT count(*) FROM audit_log a WHERE action IN ('set status', 'edit politician') AND NOT EXISTS (SELECT 1 FROM politicians p WHERE p.id = coalesce(a.details->>'politicianId', a.details->>'id')::bigint)",
          ),
        ).toEqual(["0"]);
        // Every dashboard number: at least one in the last week and in the week before, and not all the same way.
        const windows = {
          lettersSent: ["letters WHERE sent_at IS NOT NULL", "sent_at"],
          lettersReplied: ["letters WHERE replied_at IS NOT NULL", "replied_at"],
          lettersBounced: ["letter_events WHERE status = 'bounced'", "at"],
          mpsSigned: ["campaign_statuses WHERE status = 'signed'", "updated_at"],
          supportersAdded: ["supporters WHERE true", "created_at"],
          eventRegistrations: [
            "luma_guests WHERE approval_status = 'approved' AND removed_at IS NULL",
            "registered_at",
          ],
          unsubscribes: ["opt_outs WHERE resubscribed_at IS NULL", "unsubscribed_at"],
          addressesBlocked: ["email_blocks b JOIN email_problems p ON p.id = b.problem_id WHERE true", "p.at"],
        };
        const changes = Object.entries(windows).map(([metric, [from, at]]) => {
          const [week, previous] = runSql(
            name,
            `SELECT (SELECT count(*) FROM ${from} AND ${at} >= now() - interval '7 days'), (SELECT count(*) FROM ${from} AND ${at} >= now() - interval '14 days' AND ${at} < now() - interval '7 days')`,
          )[0]
            .split("\t")
            .map(Number);
          expect(week, `${metric} this week`).toBeGreaterThan(0);
          expect(previous, `${metric} the week before`).toBeGreaterThan(0);
          return Math.sign(week - previous);
        });
        expect(changes).toContain(1);
        expect(changes).toContain(-1);
      } finally {
        dropDatabase(name);
      }
    },
  );
});
