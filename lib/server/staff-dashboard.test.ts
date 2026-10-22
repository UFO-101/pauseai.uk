import { afterEach, expect, it, vi } from "vitest";
import { addTestMp, addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { recordFailure, recordRun } from "./import-runs";
import { dashboard } from "./staff-dashboard";

describeWithDatabase("dashboard", () => {
  useTestDatabase();
  afterEach(() => vi.unstubAllEnvs());

  /** A real MP and a test MP, with letters, statuses, events, guests, opt-outs, blocks and runs in every window. */
  async function fill() {
    vi.stubEnv("FIXTURE_NOW", "2026-10-21T12:00:00.000Z");
    const real = await addTestPolitician();
    const gone = await addTestPolitician({
      airtableId: "recGone",
      name: "Gordon Gone",
      email: "gone@parliament.uk",
      sitting: false,
    });
    const test = await addTestMp();
    // Letters to the real MP: one this week, replied to this week; one the week before; one long ago. Letters to the test MP are counted apart.
    await query(
      `INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode, contact_consent, subject, reply_hash, status, sent_at, replied_at)
       VALUES ('regulate-letter-pm', $1, 'Old', 'old@example.com', 'x', 'ZZ9 9ZZ', false, 'S', 'a', 'sent', '2026-09-01T10:00:00Z', '2026-09-02T10:00:00Z'),
              ('support-sobel-bill', $1, 'Last', 'last@example.com', 'x', 'ZZ9 9ZZ', false, 'S', 'b', 'sent', '2026-10-10T10:00:00Z', NULL),
              ('regulate-letter-pm', $1, 'New', 'new@example.com', 'x', 'ZZ9 9ZZ', false, 'S', 'c', 'sent', '2026-10-20T10:00:00Z', '2026-10-20T15:00:00Z'),
              ('regulate-letter-pm', $2, 'Test', 'test@example.com', 'x', 'ZZ9 9ZZ', false, 'S', 'd', 'sent', '2026-10-19T10:00:00Z', '2026-10-19T12:00:00Z'),
              ('regulate-letter-pm', $2, 'Bounce', 'bounce@example.com', 'x', 'ZZ9 9ZZ', false, 'S', 'e', 'bounced', '2026-10-18T10:00:00Z', NULL)`,
      [real, test],
    );
    // The real MP signed this week; the test MP's status doesn't count.
    await query(
      `INSERT INTO campaign_statuses (politician_id, campaign, status, updated_by, updated_at)
       VALUES ($1, 'regulate-letter-pm', 'signed', 'x', '2026-10-15T00:00:00Z'), ($2, 'support-sobel-bill', 'signed', 'x', '2026-10-16T00:00:00Z')`,
      [real, test],
    );
    // Supporters: this week, the week before, and five weeks ago.
    await query(
      "INSERT INTO supporters (created_at) VALUES ('2026-10-20T00:00:00Z'), ('2026-10-10T00:00:00Z'), ('2026-09-15T00:00:00Z')",
    );
    // Events: one held this week, one the week before, one to come; registrations this week, three weeks ago, and ones that don't count.
    await query(
      `INSERT INTO luma_events (id, name, url, start_at, access) VALUES
         ('e1', 'This week', 'https://luma.com/e1', '2026-10-18T18:00:00Z', 'manage'),
         ('e2', 'Last week', 'https://luma.com/e2', '2026-10-08T18:00:00Z', 'manage'),
         ('e3', 'To come', 'https://luma.com/e3', '2030-01-01T00:00:00Z', 'manage');
       INSERT INTO luma_people (user_id, email, name) VALUES ('u1', 'u1@example.com', 'U1'), ('u2', 'u2@example.com', 'U2'), ('u3', 'u3@example.com', 'U3');
       INSERT INTO luma_guests (id, event_id, user_id, approval_status, registered_at, removed_at) VALUES
         ('g1', 'e3', 'u1', 'approved', '2026-10-19T00:00:00Z', NULL),
         ('g2', 'e3', 'u2', 'approved', '2026-10-20T00:00:00Z', NULL),
         ('g3', 'e3', 'u3', 'declined', '2026-10-19T00:00:00Z', NULL),
         ('g4', 'e3', 'u3', 'approved', '2026-10-19T00:00:00Z', '2026-10-20T00:00:00Z'),
         ('g5', 'e1', 'u3', 'approved', '2026-10-01T00:00:00Z', NULL);
       INSERT INTO opt_outs (address, list, source, source_ref, unsubscribed_at, resubscribed_at) VALUES
         ('u1@example.com', 'luma-calendar', 'luma-webhook', 'r1', '2026-10-20T00:00:00Z', NULL),
         ('u2@example.com', 'luma-calendar', 'luma-webhook', 'r2', '2026-10-20T00:00:00Z', '2026-10-21T00:00:00Z');`,
    );
    // Blocked: the real MP's address, which needs a person; a politician who has left, and a supporter, which don't.
    await query(
      `INSERT INTO email_problems (id, at, address, kind, reason, can_reset) OVERRIDING SYSTEM VALUE VALUES
         (1, '2026-10-19T09:30:00Z', 'polly.placeholder.mp@parliament.uk', 'hard', 'Mailbox full', true),
         (2, '2026-10-01T00:00:00Z', 'gone@parliament.uk', 'hard', 'Mailbox closed', true),
         (3, '2026-10-19T00:00:00Z', 'u1@example.com', 'complaint', '', false);
       INSERT INTO email_blocks (address, problem_id) VALUES ('polly.placeholder.mp@parliament.uk', 1), ('gone@parliament.uk', 2), ('u1@example.com', 3);`,
    );
    // Runs: the Luma import's newest failed; an MP sync is held; the check is well.
    await recordRun("import-luma", "jo", "ok", { events: 1 });
    await recordFailure("import-luma", "jo", new Error("Luma answered 500"));
    await query(
      `INSERT INTO import_runs (at, job, started_by, status, result) VALUES
         ('2026-10-21T00:00:00Z', 'sync-mps', 'nightly', 'held', '{"changes": {"added": [], "removed": [{"airtableId": "a"}, {"airtableId": "b"}], "changed": []}, "mps": []}')`,
    );
    await recordRun("check-mps", "nightly", "ok", { problems: [] });
    return { real, gone, test };
  }

  it("counts each metric in the week and the week before, leaving test MPs out, with the breakdowns, series and actions", async () => {
    const { real } = await fill();
    const result = await dashboard(7);
    expect(result.days).toBe(7);
    expect(result.asOf).toBe("2026-10-21T12:00:00.000Z");
    expect(result.since).toBe("2026-10-14T12:00:00.000Z");
    expect(result.counts).toEqual({
      lettersSent: { current: 1, previous: 1 },
      lettersReplied: { current: 1, previous: 0 },
      mpsSigned: { current: 1, previous: 0 },
      eventRegistrations: { current: 2, previous: 0 },
      eventsHeld: { current: 1, previous: 1 },
      supportersAdded: { current: 1, previous: 1 },
      unsubscribes: { current: 1, previous: 0 },
    });
    expect(result.testLetters).toBe(1);
    expect(result.byCampaign).toEqual({
      lettersSent: { "regulate-letter-pm": 1 },
      mpsSigned: { "regulate-letter-pm": 1 },
    });
    // Eight weeks, oldest first, the current week last: the registration three weeks ago, then this week's two.
    expect(result.series.eventRegistrations.map((point) => point.count)).toEqual([0, 0, 0, 0, 0, 1, 0, 2]);
    expect(result.series.supportersAdded.map((point) => point.count)).toEqual([0, 0, 1, 0, 0, 0, 1, 1]);
    expect(result.series.eventRegistrations[0].from).toBe("2026-08-26T12:00:00.000Z");
    expect(result.series.eventRegistrations[7].from).toBe(result.since);
    expect(result.actions).toEqual([
      { kind: "held-sync", at: "2026-10-21T00:00:00.000Z", added: 0, removed: 2, changed: 0 },
      {
        kind: "blocked-mp",
        politicianId: real,
        name: "Polly Placeholder",
        at: "2026-10-19T09:30:00.000Z",
        reason: "Mailbox full",
      },
      { kind: "failed-import", job: "import-luma", at: expect.any(String), error: "Luma answered 500" },
    ]);
  });

  it("counts over a longer window, with the series in windows of that length", async () => {
    await fill();
    const result = await dashboard(30);
    expect(result.days).toBe(30);
    expect(result.since).toBe("2026-09-21T12:00:00.000Z");
    expect(result.counts.eventsHeld).toEqual({ current: 2, previous: 0 });
    expect(result.counts.lettersSent).toEqual({ current: 2, previous: 1 });
    expect(result.counts.supportersAdded).toEqual({ current: 2, previous: 1 });
    expect(result.series.supportersAdded.map((point) => point.count)).toEqual([0, 0, 0, 0, 0, 0, 1, 2]);
    expect(result.series.supportersAdded[7].from).toBe(result.since);
  });
});
