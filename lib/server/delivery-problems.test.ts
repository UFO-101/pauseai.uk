import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { staffCopy } from "@/lib/content/staff-interface";
import { addTestLetter, addTestMp, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { handleDeliveryProblem } from "./delivery-problems";
import type { DeliveryProblem, Purpose } from "./email";

/** Postmark's webhook call, which on Netlify arrives on the netlify.app host. */
const REQUEST = new Request("https://main--pauseaiuk.netlify.app/api/postmark/bounce", { method: "POST" });
const BOUNCE: DeliveryProblem = {
  address: "test-mp@example.org",
  messageId: "msg-1",
  kind: "hard",
  reason: "Unknown user",
  canReset: true,
  details: { type: "HardBounce" },
};

type Sent = { To: string; Subject: string; TextBody: string };

beforeEach(() => {
  vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
  vi.stubEnv("POLICY_INBOX", "replies@pauseai.uk");
  vi.stubEnv("SITE_ORIGIN", "https://pauseai.uk");
});
afterEach(() => vi.unstubAllEnvs());

describeWithDatabase("handleDeliveryProblem", () => {
  useTestDatabase();

  /** Records each email sent through Postmark. */
  function postmark() {
    const sent: Sent[] = [];
    server.use(
      http.post("https://api.postmarkapp.com/email", async ({ request }) => {
        sent.push((await request.json()) as Sent);
        return HttpResponse.json({ ErrorCode: 0, MessageID: `alert-${sent.length}` });
      }),
    );
    return sent;
  }

  /** A sent letter to the test MP, its email logged as msg-1, or an email of another purpose. */
  async function sentEmail(purpose: Purpose = "letter"): Promise<number> {
    const mp = await addTestMp();
    const id = await addTestLetter({ politicianId: mp, senderName: "Jane", senderEmail: "jane@example.com" });
    await query(
      "INSERT INTO email_sends (purpose, letter_id, address, outcome, message_id) VALUES ($1, $2, 'test-mp@example.org', 'sent', 'msg-1')",
      [purpose, purpose === "letter" ? id : null],
    );
    return id;
  }

  const letter = async () => (await query<{ status: string }>("SELECT status FROM letters"))[0].status;
  const events = () => query("SELECT status, details FROM letter_events");

  it("marks a mailing's letter that bounced, without emailing staff", async () => {
    const mp = await addTestMp();
    const [{ id }] = await query<{ id: number }>(
      "INSERT INTO letters (kind, notable_person_id, status) VALUES ('pauseai', $1, 'sent') RETURNING id::int AS id",
      [mp],
    );
    await query(
      "INSERT INTO email_sends (purpose, letter_id, address, outcome, message_id, backend, sender) VALUES ('mailing', $1, 'test-mp@example.org', 'sent', 'msg-1', 'gmail', 'jo@pauseai.uk')",
      [id],
    );
    const sent = postmark();
    await handleDeliveryProblem(BOUNCE, REQUEST);
    expect(await letter()).toBe("bounced");
    expect(await events()).toMatchObject([{ status: "bounced" }]);
    expect(sent).toEqual([]);
  });

  it("marks a letter that hard-bounced, blocks the address, and emails staff a link to the blocked addresses", async () => {
    await sentEmail();
    const sent = postmark();
    await handleDeliveryProblem(BOUNCE, REQUEST);
    expect(await letter()).toBe("bounced");
    expect(await events()).toEqual([
      {
        status: "bounced",
        details: { type: "HardBounce", reason: "Unknown user", email: "test-mp@example.org" },
      },
    ]);
    expect(await query("SELECT address FROM email_blocks")).toEqual([{ address: "test-mp@example.org" }]);
    expect(sent).toEqual([
      expect.objectContaining({
        To: "replies@pauseai.uk",
        Subject: staffCopy.alert.subject("Testy McTestface MP"),
        TextBody: staffCopy.alert.body(
          "Testy McTestface MP",
          "test-mp@example.org",
          "Unknown user",
          "https://pauseai.uk/staff/politicians/blocked-emails",
        ),
      }),
    ]);
    expect(await query("SELECT purpose FROM email_sends ORDER BY id")).toEqual([
      { purpose: "letter" },
      { purpose: "staff-alert" },
    ]);
  });

  it("marks a spam complaint, and tells staff", async () => {
    await sentEmail();
    const sent = postmark();
    await handleDeliveryProblem({ ...BOUNCE, kind: "complaint" }, REQUEST);
    expect(await letter()).toBe("spam_complaint");
    expect(sent).toHaveLength(1);
  });

  it("marks a soft bounce, without blocking the address or telling staff", async () => {
    await sentEmail();
    const sent = postmark();
    await handleDeliveryProblem({ ...BOUNCE, kind: "soft", details: undefined }, REQUEST);
    expect(await letter()).toBe("bounced");
    expect(await events()).toMatchObject([{ details: { reason: "Unknown user" } }]);
    expect(await query("SELECT address FROM email_blocks")).toEqual([]);
    expect(sent).toEqual([]);
  });

  it("tells nobody when there's no shared inbox", async () => {
    vi.stubEnv("POLICY_INBOX", "");
    await sentEmail();
    const sent = postmark();
    await handleDeliveryProblem(BOUNCE, REQUEST);
    expect(await letter()).toBe("bounced");
    expect(sent).toEqual([]);
  });

  it("leaves letters alone for other emails, ones we didn't send, and a letter since deleted", async () => {
    const sent = postmark();
    for (const purpose of ["forwarded-reply", "staff-login", "staff-alert"] as const) {
      await query("TRUNCATE letters, email_sends, politicians RESTART IDENTITY CASCADE");
      await sentEmail(purpose);
      await handleDeliveryProblem(BOUNCE, REQUEST);
      expect(await letter()).toBe("sent");
    }
    await handleDeliveryProblem({ ...BOUNCE, messageId: null }, REQUEST);
    await handleDeliveryProblem({ ...BOUNCE, messageId: "unknown" }, REQUEST);
    expect(await letter()).toBe("sent");

    await query("TRUNCATE letters, email_sends, politicians RESTART IDENTITY CASCADE");
    const id = await sentEmail();
    await query("DELETE FROM letters WHERE id = $1", [id]);
    await handleDeliveryProblem(BOUNCE, REQUEST);
    expect(await query("SELECT * FROM letter_events")).toEqual([]);
    expect(sent).toEqual([]);
    // Every problem is still recorded.
    expect(await query("SELECT count(*)::int AS n FROM email_problems")).toEqual([{ n: 6 }]);
  });
});
