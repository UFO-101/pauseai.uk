import { afterEach, expect, it, vi } from "vitest";
import { addTestMp, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { recordFailure, recordRun } from "./import-runs";
import { dashboard } from "./staff-dashboard";

describeWithDatabase("dashboard", () => {
  useTestDatabase();
  afterEach(() => vi.unstubAllEnvs());

  it("counts each metric in the week and the week before, and finds each import's newest run", async () => {
    vi.stubEnv("FIXTURE_NOW", "2026-10-21T12:00:00.000Z");
    const mp = await addTestMp();
    // Three letters sent: one this week, one the week before, one long ago; the old ones replied to, one bounced.
    await query(
      `INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode, contact_consent, subject, reply_hash, status, sent_at, replied_at)
       VALUES ('regulate-letter-pm', $1, 'Old', 'old@example.com', 'x', 'ZZ9 9ZZ', false, 'S', 'a', 'bounced', '2026-09-01T10:00:00Z', '2026-09-02T10:00:00Z'),
              ('regulate-letter-pm', $1, 'Last', 'last@example.com', 'x', 'ZZ9 9ZZ', false, 'S', 'c', 'sent', '2026-10-10T10:00:00Z', '2026-10-12T10:00:00Z'),
              ('regulate-letter-pm', $1, 'New', 'new@example.com', 'x', 'ZZ9 9ZZ', false, 'S', 'b', 'sent', '2026-10-20T10:00:00Z', NULL)`,
      [mp],
    );
    await query("INSERT INTO letter_events (letter_id, at, status) VALUES (1, '2026-09-01T11:00:00Z', 'bounced')");
    await query(
      `INSERT INTO campaign_statuses (politician_id, campaign, status, updated_by, updated_at) VALUES ($1, 'regulate-letter-pm', 'signed', 'x', '2026-10-15T00:00:00Z')`,
      [mp],
    );
    await query("INSERT INTO supporters (created_at) VALUES ('2026-10-01T00:00:00Z'), ('2026-10-20T00:00:00Z')");
    await query(
      `INSERT INTO luma_events (id, name, url, start_at, access) VALUES ('e', 'E', 'https://luma.com/e', '2030-01-01T00:00:00Z', 'manage');
       INSERT INTO luma_people (user_id, email, name, contact_since) VALUES ('u1', 'u1@example.com', 'U1', '2026-10-18T00:00:00Z'), ('u2', 'u2@example.com', 'U2', NULL), ('u3', 'u3@example.com', 'U3', '2026-01-01T00:00:00Z');
       INSERT INTO luma_guests (id, event_id, user_id, approval_status, registered_at, removed_at) VALUES
         ('g1', 'e', 'u1', 'approved', '2026-10-19T00:00:00Z', NULL),
         ('g2', 'e', 'u2', 'declined', '2026-10-19T00:00:00Z', NULL),
         ('g3', 'e', 'u3', 'approved', '2026-10-19T00:00:00Z', '2026-10-20T00:00:00Z'),
         ('g4', 'e', 'u3', 'approved', '2026-02-01T00:00:00Z', NULL);
       INSERT INTO opt_outs (address, list, source, source_ref, unsubscribed_at, resubscribed_at) VALUES
         ('u1@example.com', 'luma-calendar', 'luma-webhook', 'r1', '2026-10-20T00:00:00Z', NULL),
         ('u2@example.com', 'luma-calendar', 'luma-webhook', 'r2', '2026-10-20T00:00:00Z', '2026-10-21T00:00:00Z');
       INSERT INTO email_problems (id, at, address, kind, can_reset) OVERRIDING SYSTEM VALUE VALUES
         (1, '2026-10-19T00:00:00Z', 'a@example.com', 'hard', true), (2, '2026-03-01T00:00:00Z', 'b@example.com', 'complaint', false), (3, '2026-10-19T00:00:00Z', 'c@example.com', 'soft', true);
       INSERT INTO email_blocks (address, problem_id) VALUES ('a@example.com', 1), ('b@example.com', 2);`,
    );
    await recordRun("import-luma", "jo", "ok", { events: 1 });
    await recordFailure("import-luma", "jo", new Error("Luma answered 500"));
    await recordRun("check-mps", "nightly", "ok", { problems: [] });

    const result = await dashboard();
    expect(result.since).toBe("2026-10-14T12:00:00.000Z");
    expect(result.counts).toEqual({
      lettersSent: { week: 1, previous: 1 },
      lettersReplied: { week: 0, previous: 1 },
      lettersBounced: { week: 0, previous: 0 },
      mpsSigned: { week: 1, previous: 0 },
      supportersAdded: { week: 1, previous: 0 },
      eventRegistrations: { week: 1, previous: 0 },
      unsubscribes: { week: 1, previous: 0 },
      addressesBlocked: { week: 1, previous: 0 },
    });
    expect(result.imports.map((run) => run && [run.job, run.status])).toEqual([
      ["import-luma", "failed"],
      undefined,
      ["check-mps", "ok"],
      undefined,
      undefined,
    ]);
  });
});
