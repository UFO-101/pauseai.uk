import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { addTestMp, addTestPolitician, describeWithDatabase, useDatabaseUpTo, useTestDatabase } from "@/tests/database";
import { migrate } from "@/scripts/db-migrate.mjs";
import { query } from "./db";
import {
  bareAddress,
  blockOn,
  isBlocked,
  listBlocks,
  recentProblems,
  recordProblem,
  send,
  unblock,
  type DeliveryProblem,
} from "./email";

const POSTMARK = "https://api.postmarkapp.com/email";
const UNSUPPRESS = "https://api.postmarkapp.com/message-streams/outbound/suppressions/delete";
const EMAIL = { From: "a@notify.pauseai.uk", To: '"Jo" <Jo@Example.org>', Subject: "S", TextBody: "T" };
const BOUNCE: DeliveryProblem = {
  address: "Jo@Example.org",
  messageId: "msg-1",
  kind: "hard",
  reason: "Unknown user",
  canReset: true,
};

beforeEach(() => vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token"));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const sends = () =>
  query(
    'SELECT purpose, letter_id AS "letterId", address, outcome, message_id AS "messageId" FROM email_sends ORDER BY id',
  );
const audit = () => query("SELECT actor, action, details FROM audit_log ORDER BY id");

describe("bareAddress", () => {
  it("takes the address out of a To header, lowercased", () => {
    expect(bareAddress('"Jo Bloggs MP" <Jo@Example.org>')).toBe("jo@example.org");
    expect(bareAddress(" Jo@Example.org ")).toBe("jo@example.org");
  });
});

describeWithDatabase("send", () => {
  useTestDatabase();

  it("sends the email, and logs it with what it was for", async () => {
    server.use(http.post(POSTMARK, () => HttpResponse.json({ ErrorCode: 0, MessageID: "msg-1" })));
    expect(await send(EMAIL, "staff-login")).toEqual({ sent: true, id: "msg-1" });
    expect(await sends()).toEqual([
      { purpose: "staff-login", letterId: null, address: "jo@example.org", outcome: "sent", messageId: "msg-1" },
    ]);
  });

  it("refuses a blocked address without asking Postmark, and logs that", async () => {
    let asked = false;
    server.use(
      http.post(POSTMARK, () => {
        asked = true;
        return HttpResponse.json({ ErrorCode: 0, MessageID: "msg-1" });
      }),
    );
    await recordProblem(BOUNCE);
    expect(await send(EMAIL, "forwarded-reply")).toEqual({ sent: false, reason: "blocked" });
    expect(asked).toBe(false);
    expect(await sends()).toMatchObject([{ outcome: "refused", messageId: null }]);
  });

  it("blocks an address Postmark says it suppressed, which it hadn't told us about", async () => {
    server.use(
      http.post(POSTMARK, () => HttpResponse.json({ ErrorCode: 406, Message: "Inactive recipient" }, { status: 422 })),
    );
    expect(await send(EMAIL, "staff-login")).toEqual({ sent: false, reason: "blocked" });
    expect(await isBlocked("jo@example.org")).toBe(true);
    expect(await query("SELECT kind, can_reset, message_id FROM email_problems")).toEqual([
      { kind: "hard", can_reset: true, message_id: null },
    ]);
    expect(await sends()).toMatchObject([{ outcome: "refused" }]);
  });

  it("says it failed, and logs it, when Postmark fails for any other reason", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    server.use(http.post(POSTMARK, () => HttpResponse.json({ ErrorCode: 300, Message: "Invalid" }, { status: 422 })));
    expect(await send(EMAIL, "staff-alert")).toEqual({ sent: false, reason: "failed" });
    expect(error.mock.calls[0][0]).toBe("Couldn't send an email (staff-alert):");
    expect(await sends()).toMatchObject([{ outcome: "failed", messageId: null }]);
    expect(await isBlocked("jo@example.org")).toBe(false);
  });
});

describeWithDatabase("recordProblem", () => {
  useTestDatabase();

  it("records a soft bounce without blocking the address", async () => {
    expect(await recordProblem({ ...BOUNCE, kind: "soft" })).toBe(false);
    expect(await isBlocked("jo@example.org")).toBe(false);
    expect(await query("SELECT address, kind, reason, details FROM email_problems")).toEqual([
      { address: "jo@example.org", kind: "soft", reason: "Unknown user", details: {} },
    ]);
    expect(await audit()).toEqual([]);
  });

  it("blocks the address for a hard bounce, once, and the audit log says so", async () => {
    expect(await recordProblem({ ...BOUNCE, details: { type: "HardBounce" } })).toBe(true);
    expect(await recordProblem(BOUNCE)).toBe(false);
    expect(await isBlocked("JO@example.org")).toBe(true);
    expect(await query("SELECT details FROM email_problems ORDER BY id")).toEqual([
      { details: { type: "HardBounce" } },
      { details: {} },
    ]);
    expect(await audit()).toEqual([
      { actor: "postmark", action: "block address", details: { address: "jo@example.org", kind: "hard" } },
    ]);
  });

  it("lets a complaint take over a bounce's block, as it can't be reset, but not the other way round", async () => {
    await recordProblem(BOUNCE);
    expect(await recordProblem({ ...BOUNCE, kind: "complaint", canReset: true })).toBe(true);
    expect(await recordProblem(BOUNCE)).toBe(false);
    expect(await recordProblem({ ...BOUNCE, kind: "complaint" })).toBe(false);
    expect(await listBlocks()).toMatchObject([{ kind: "complaint", canReset: false }]);
  });
});

describeWithDatabase("unblock", () => {
  useTestDatabase();

  it("asks Postmark to send to it again, unblocks it, and logs who and why", async () => {
    let asked: unknown;
    server.use(
      http.post(UNSUPPRESS, async ({ request }) => {
        asked = await request.json();
        return HttpResponse.json({ Suppressions: [] });
      }),
    );
    await recordProblem(BOUNCE);
    expect(await unblock("jo@example.org", "sam@pauseai.uk", "Fixed")).toBe(true);
    expect(asked).toEqual({ Suppressions: [{ EmailAddress: "jo@example.org" }] });
    expect(await isBlocked("jo@example.org")).toBe(false);
    expect((await audit()).at(-1)).toEqual({
      actor: "sam@pauseai.uk",
      action: "unblock address",
      details: { address: "jo@example.org", note: "Fixed" },
    });
    // The problem stays, as history.
    expect(await query("SELECT count(*)::int AS n FROM email_problems")).toEqual([{ n: 1 }]);
  });

  it("refuses a complaint, one Postmark can't reset, and an address that isn't blocked", async () => {
    await recordProblem({ ...BOUNCE, kind: "complaint" });
    await recordProblem({ ...BOUNCE, address: "b@example.org", canReset: false });
    expect(await unblock("jo@example.org", "sam@pauseai.uk", "Fixed")).toBe(false);
    expect(await unblock("b@example.org", "sam@pauseai.uk", "Fixed")).toBe(false);
    expect(await unblock("c@example.org", "sam@pauseai.uk", "Fixed")).toBe(false);
    expect(await isBlocked("jo@example.org")).toBe(true);
  });

  it("leaves it blocked if Postmark can't be reached", async () => {
    server.use(http.post(UNSUPPRESS, () => new HttpResponse(null, { status: 500 })));
    await recordProblem(BOUNCE);
    await expect(unblock("jo@example.org", "sam@pauseai.uk", "Fixed")).rejects.toThrow("500");
    expect(await isBlocked("jo@example.org")).toBe(true);
  });

  it("refuses without a note, before asking Postmark, and the audit log refuses one without a note too", async () => {
    let asked = false;
    server.use(
      http.post(UNSUPPRESS, () => {
        asked = true;
        return HttpResponse.json({ Suppressions: [] });
      }),
    );
    await recordProblem(BOUNCE);
    expect(await unblock("jo@example.org", "sam@pauseai.uk", " ")).toBe(false);
    expect(asked).toBe(false);
    expect(await isBlocked("jo@example.org")).toBe(true);
    await expect(
      query("INSERT INTO audit_log (actor, action, details) VALUES ('x', 'unblock address', '{\"note\": \" \"}')"),
    ).rejects.toThrow(/audit_log_unblock_note/);
    await expect(
      query("INSERT INTO audit_log (actor, action, details) VALUES ('x', 'unblock address', '{}')"),
    ).rejects.toThrow(/audit_log_unblock_note/);
  });

  it("says it wasn't unblocked if someone else got there first", async () => {
    await recordProblem(BOUNCE);
    server.use(
      http.post(UNSUPPRESS, async () => {
        await query("DELETE FROM email_blocks");
        return HttpResponse.json({ Suppressions: [] });
      }),
    );
    expect(await unblock("jo@example.org", "sam@pauseai.uk", "Fixed")).toBe(false);
    expect((await audit()).map((a) => a.action)).toEqual(["block address"]);
  });
});

describeWithDatabase("listBlocks, blockOn and recentProblems", () => {
  useTestDatabase();

  it("list each blocked address with whose it is, the letter that found it out, and emails not sent since", async () => {
    const mp = await addTestMp();
    const polly = await addTestPolitician({ email: "Test-MP@example.org" });
    const [{ id: letterId }] = await query<{ id: number }>(
      `INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode, contact_consent, subject, reply_hash, status)
       VALUES ('regulate-letter-pm', $1, 'Jane', 'jane@example.com', 'x', 'ZZ9 9ZZ', false, 'S', 'h', 'sent') RETURNING id::int AS id`,
      [mp],
    );
    await query(
      `INSERT INTO email_sends (at, purpose, letter_id, address, outcome, message_id)
       VALUES (now() - interval '1 day', 'letter', $1, 'test-mp@example.org', 'sent', 'msg-1')`,
      [letterId],
    );
    await recordProblem({ ...BOUNCE, address: "test-mp@example.org" });
    await recordProblem({ ...BOUNCE, address: "other@example.org", messageId: null, kind: "complaint" });
    await recordProblem({ ...BOUNCE, address: "soft@example.org", messageId: null, kind: "soft" });
    // One refused before the bounce, which doesn't count, and one after.
    await query(
      `INSERT INTO email_sends (at, purpose, address, outcome) VALUES
       (now() - interval '2 days', 'letter', 'test-mp@example.org', 'refused'),
       (now() + interval '1 minute', 'letter', 'test-mp@example.org', 'refused')`,
    );

    const blocks = await listBlocks();
    expect(blocks.map((b) => b.address)).toEqual(["other@example.org", "test-mp@example.org"]);
    expect(blocks[1]).toEqual({
      address: "test-mp@example.org",
      kind: "hard",
      reason: "Unknown user",
      since: expect.any(Date),
      canReset: true,
      politicians: [
        { id: polly, name: "Polly Placeholder" },
        { id: mp, name: "Testy McTestface MP" },
      ],
      letter: { id: letterId, to: "Testy McTestface MP" },
      refused: 1,
    });
    expect(blocks[0]).toMatchObject({ kind: "complaint", politicians: [], letter: null, refused: 0 });
    expect((await listBlocks("complaint")).map((b) => b.address)).toEqual(["other@example.org"]);

    expect(await blockOn("Test-MP@example.org")).toMatchObject({ address: "test-mp@example.org" });
    expect(await blockOn("soft@example.org")).toBeUndefined();
    expect(await blockOn(null)).toBeUndefined();

    expect(await recentProblems()).toEqual([
      expect.objectContaining({ address: "soft@example.org", kind: "soft", purpose: null, letter: null }),
      expect.objectContaining({ address: "other@example.org", kind: "complaint" }),
      expect.objectContaining({
        address: "test-mp@example.org",
        kind: "hard",
        purpose: "letter",
        letter: { id: letterId, to: "Testy McTestface MP" },
      }),
    ]);
    expect(await recentProblems(1)).toHaveLength(1);
  });
});

describeWithDatabase("migration 0014_email_deliverability", () => {
  const db = useDatabaseUpTo("0013");

  it("logs the letters already sent, so their bounces find them, and drops their message IDs", async () => {
    const [{ id: mp }] = await query<{ id: number }>(
      `INSERT INTO politicians (house, name, email, is_test, test_postcode) VALUES ('commons', 'Testy', 'Test-MP@example.org', true, 'ZZ99ZZ')
       RETURNING id::int AS id`,
    );
    await query(
      `INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode, contact_consent,
         subject, reply_hash, status, postmark_message_id, sent_at)
       VALUES ('regulate-letter-pm', $1, 'Jane', 'j@example.com', 'x', 'ZZ9 9ZZ', false, 'S', 'a', 'sent', 'msg-1', '2026-10-12T09:00:00Z'),
              ('regulate-letter-pm', $1, 'Sam', 's@example.com', 'x', 'ZZ9 9ZZ', false, 'S', 'b', 'sending', NULL, NULL)`,
      [mp],
    );

    expect(migrate(db.url, { appliedUpTo: "0013" })[0]).toBe("0014_email_deliverability");

    expect(
      await query(
        `SELECT at, purpose, letter_id::int AS "letterId", address, outcome, message_id AS "messageId" FROM email_sends`,
      ),
    ).toEqual([
      {
        at: new Date("2026-10-12T09:00:00Z"),
        purpose: "letter",
        letterId: 1,
        address: "test-mp@example.org",
        outcome: "sent",
        messageId: "msg-1",
      },
    ]);
    expect(
      await query("SELECT column_name FROM information_schema.columns WHERE column_name = 'postmark_message_id'"),
    ).toEqual([]);
  });
});
