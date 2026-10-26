import { afterEach, expect, it, vi } from "vitest";
import { addTestLetter, addTestMp, addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
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
      status: "left_office",
    });
    const test = await addTestMp();
    // Letters to the real MP: one this week, replied to this week; one the week before; one long ago. Letters to the test MP are counted apart.
    for (const [campaign, politicianId, senderEmail, status, sentAt, repliedAt] of [
      ["regulate-letter-pm", real, "old@example.com", "sent", "2026-09-01T10:00:00Z", "2026-09-02T10:00:00Z"],
      ["support-sobel-bill", real, "last@example.com", "sent", "2026-10-10T10:00:00Z", null],
      ["regulate-letter-pm", real, "new@example.com", "sent", "2026-10-20T10:00:00Z", "2026-10-20T15:00:00Z"],
      ["regulate-letter-pm", test, "test@example.com", "sent", "2026-10-19T10:00:00Z", "2026-10-19T12:00:00Z"],
      ["regulate-letter-pm", test, "bounce@example.com", "bounced", "2026-10-18T10:00:00Z", null],
    ] as const) {
      await addTestLetter({ campaign, politicianId, senderEmail, status, sentAt, repliedAt });
    }
    // The real MP signed two letters this week, one of them an ask no campaign in code makes; the test MP's
    // status doesn't count, nor does Airtable's, which records signatures from before the site.
    await query(
      `INSERT INTO ask_statuses (notable_person_id, ask, ask_kind, status, updated_by, updated_at)
       VALUES ($1, 'frontier-ai-letter', 'letter', 'signed', 'x', '2026-10-15T00:00:00Z'),
              ($1, 'deepmind-letter', 'letter', 'signed', 'x', '2026-10-17T00:00:00Z'),
              ($1, 'controlai-statement', 'letter', 'signed', 'airtable', '2026-10-18T00:00:00Z'),
              ($2, 'controlai-statement', 'letter', 'signed', 'x', '2026-10-16T00:00:00Z')`,
      [real, test],
    );
    // Supporters first seen this week, the week before, and five weeks ago; and two linked this week, one first
    // seen last year and one by no record with a time, which aren't new.
    await query(
      `INSERT INTO supporters (created_at, first_seen_at) VALUES
         ('2026-10-20T00:00:00Z', '2026-10-20T00:00:00Z'), ('2026-10-20T00:00:00Z', '2026-10-10T00:00:00Z'),
         ('2026-10-20T00:00:00Z', '2026-09-15T00:00:00Z'), ('2026-10-20T00:00:00Z', '2025-10-20T00:00:00Z'),
         ('2026-10-20T00:00:00Z', NULL)`,
    );
    // Events: one held this week, one the week before, one to come, one this week gone from the calendar; registrations this week, three weeks ago, and ones that don't count.
    await query(
      `INSERT INTO luma_events (id, name, url, start_at, access, removed_at) VALUES
         ('e1', 'This week', 'https://luma.com/e1', '2026-10-18T18:00:00Z', 'manage', NULL),
         ('e2', 'Last week', 'https://luma.com/e2', '2026-10-08T18:00:00Z', 'manage', NULL),
         ('e3', 'To come', 'https://luma.com/e3', '2030-01-01T00:00:00Z', 'manage', NULL),
         ('e4', 'Removed', 'https://luma.com/e4', '2026-10-18T18:00:00Z', 'manage', '2026-10-19T00:00:00Z');
       INSERT INTO luma_people (user_id, email, name) VALUES ('u1', 'u1@example.com', 'U1'), ('u2', 'u2@example.com', 'U2'), ('u3', 'u3@example.com', 'U3');
       INSERT INTO luma_guests (id, event_id, user_id, approval_status, registered_at, removed_at) VALUES
         ('g1', 'e3', 'u1', 'approved', '2026-10-19T00:00:00Z', NULL),
         ('g2', 'e3', 'u2', 'approved', '2026-10-20T00:00:00Z', NULL),
         ('g3', 'e3', 'u3', 'declined', '2026-10-19T00:00:00Z', NULL),
         ('g4', 'e3', 'u3', 'approved', '2026-10-19T00:00:00Z', '2026-10-20T00:00:00Z'),
         ('g5', 'e1', 'u3', 'approved', '2026-10-01T00:00:00Z', NULL);
       -- Unsubscribed: u1, whose block is its answer instead; u2, back again; u3, who counts.
       INSERT INTO opt_outs (address, list, source, source_ref, unsubscribed_at, resubscribed_at) VALUES
         ('u1@example.com', 'luma-calendar', 'luma-webhook', 'r1', '2026-10-20T00:00:00Z', NULL),
         ('u2@example.com', 'luma-calendar', 'luma-webhook', 'r2', '2026-10-20T00:00:00Z', '2026-10-21T00:00:00Z'),
         ('u3@example.com', 'luma-calendar', 'luma-webhook', 'r3', '2026-10-20T00:00:00Z', NULL);`,
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
      mpsSigned: { current: 2, previous: 0 },
      eventRegistrations: { current: 2, previous: 0 },
      eventsHeld: { current: 1, previous: 1 },
      supportersAdded: { current: 1, previous: 1 },
      unsubscribes: { current: 1, previous: 0 },
    });
    // The test MP's two letters: one delivered, one that bounced after it was sent.
    expect(result.testLetters).toBe(2);
    expect(result.byCampaign).toEqual({
      lettersSent: { "regulate-letter-pm": 1 },
      mpsSigned: { "regulate-letter-pm": 1, "deepmind-letter": 1 },
    });
    // Only the real MP signed, so the tile leads to them.
    expect(result.signedMp).toBe(real);
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
      },
      { kind: "failed-import", job: "import-luma", at: expect.any(String), error: "Luma answered 500" },
    ]);
  });

  it("counts over a longer window, with the series in windows of that length", async () => {
    const { real } = await fill();
    const result = await dashboard(30);
    expect(result.days).toBe(30);
    expect(result.since).toBe("2026-09-21T12:00:00.000Z");
    expect(result.counts.eventsHeld).toEqual({ current: 2, previous: 0 });
    expect(result.counts.lettersSent).toEqual({ current: 2, previous: 1 });
    expect(result.counts.supportersAdded).toEqual({ current: 2, previous: 1 });
    expect(result.series.supportersAdded.map((point) => point.count)).toEqual([0, 0, 0, 0, 0, 0, 1, 2]);
    expect(result.series.supportersAdded[7].from).toBe(result.since);
    expect(result.signedMp).toBe(real);
  });

  it("names no one politician when more than one signed", async () => {
    await fill();
    const peer = await addTestPolitician({
      airtableId: null,
      name: "Lord Example",
      house: "lords",
      constituency: null,
      email: null,
    });
    await query(
      `INSERT INTO campaign_statuses (politician_id, campaign, status, updated_by, updated_at)
       VALUES ($1, 'support-sobel-bill', 'signed', 'x', '2026-10-17T00:00:00Z')`,
      [peer],
    );
    expect((await dashboard(7)).signedMp).toBeNull();
  });
});
