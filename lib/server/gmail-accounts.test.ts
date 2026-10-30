import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { connectTestGmail, describeWithDatabase, TEST_GMAIL_TOKEN_KEY, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import {
  connectGmail,
  disconnectGmail,
  GMAIL_DAILY_LIMIT,
  gmailAccess,
  gmailAccount,
  gmailAccounts,
  gmailReadingState,
  saveHistoryId,
  sentToday,
} from "./gmail-accounts";
import { decryptToken } from "./gmail-tokens";

const JO = "jo@pauseai.uk";
const TOKEN = "https://oauth2.googleapis.com/token";
const REVOKE = "https://oauth2.googleapis.com/revoke";

beforeEach(() => {
  vi.stubEnv("GOOGLE_CLIENT_ID", "id");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
  vi.stubEnv("GMAIL_TOKEN_KEY", TEST_GMAIL_TOKEN_KEY);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const audit = () => query("SELECT actor, action, details FROM audit_log ORDER BY id");

/** A send from `sender`, `ago` back. */
const sendFrom = (sender: string, ago: string, outcome = "sent") =>
  query(
    `INSERT INTO email_sends (purpose, address, outcome, message_id, backend, sender, at)
     VALUES ('mailing', 'p@example.org', $2, CASE WHEN $2 = 'sent' THEN gen_random_uuid()::text END, 'gmail', $1, now() - $3::interval)`,
    [sender, outcome, ago],
  );

describeWithDatabase("connected Gmail accounts", () => {
  useTestDatabase();

  it("connects a staff member's own Gmail, keeping the token encrypted, read from now on", async () => {
    await query("INSERT INTO staff_accounts (email, added_by) VALUES ($1, 'test')", [JO]);
    expect(await connectGmail("Jo@pauseai.uk", "fixture:jo@pauseai.uk", "https://pauseai.uk/cb")).toEqual({
      connected: true,
    });
    const [row] = await query<{ token: Buffer; historyId: string }>(
      `SELECT gmail_token AS token, gmail_history_id AS "historyId" FROM staff_accounts WHERE email = $1`,
      [JO],
    );
    expect(decryptToken(row.token)).toBe("fixture-refresh:jo@pauseai.uk");
    expect(row.historyId).toBe("1000");
    // With the name it sends as, which the fixture Google makes from its address.
    expect((await gmailAccounts()).map((one) => one.name)).toEqual(["Jo"]);
    expect(await audit()).toEqual([{ actor: "Jo@pauseai.uk", action: "connect gmail", details: { email: JO } }]);
    expect(await gmailAccess(JO)).toBe("fixture-access:jo@pauseai.uk");
  });

  it("refuses another account than their own, and lets go of its token", async () => {
    await query("INSERT INTO staff_accounts (email, added_by) VALUES ($1, 'test')", [JO]);
    let revoked = "";
    server.use(
      http.post(REVOKE, ({ request }) => {
        revoked = new URL(request.url).searchParams.get("token")!;
        return HttpResponse.json({});
      }),
    );
    expect(await connectGmail(JO, "fixture:sam@gmail.com", "https://pauseai.uk/cb")).toEqual({
      connected: false,
      reason: "other-account",
    });
    expect(revoked).toBe("fixture-refresh:sam@gmail.com");
    expect(await gmailAccounts()).toEqual([]);
  });

  it("lists the connected accounts with what each has sent in the last day, and what's left", async () => {
    await connectTestGmail(JO);
    await connectTestGmail("al@pauseai.uk");
    await query("INSERT INTO staff_accounts (email, added_by) VALUES ('samuel.whitlock@pauseai.uk', 'test')");
    await sendFrom(JO, "1 hour");
    await sendFrom(JO, "2 hours");
    await sendFrom(JO, "2 hours", "failed");
    await sendFrom(JO, "25 hours");
    expect(await gmailAccounts()).toEqual([
      {
        email: "al@pauseai.uk",
        name: "",
        names: [],
        connectedAt: expect.any(Date),
        sentToday: 0,
        remaining: GMAIL_DAILY_LIMIT,
      },
      { email: JO, name: "", names: [], connectedAt: expect.any(Date), sentToday: 2, remaining: GMAIL_DAILY_LIMIT - 2 },
    ]);
    expect(await gmailAccount("JO@pauseai.uk")).toMatchObject({ email: JO });
    expect(await gmailAccount("samuel.whitlock@pauseai.uk")).toBeUndefined();
    expect(await sentToday(JO)).toBe(2);
    expect(await sentToday("samuel.whitlock@pauseai.uk")).toBe(0);
  });

  it("offers its own name, then the names its scheduled and sent mailings went in, latest first, once each", async () => {
    await connectTestGmail(JO);
    await query("UPDATE staff_accounts SET gmail_name = 'Jo' WHERE email = $1", [JO]);
    await query(
      `INSERT INTO mailings (title, audience, channel, filter, body, created_by, sent_from, from_name, due_at, state, updated_at)
       SELECT 'A mailing', 'politicians', 'email', '{"list": "politicians", "params": {}}', '{}', $1, sender, name, now(), state,
         now() - ago::interval
       FROM (VALUES ($1, 'Jo, PauseAI UK', 'sent', '3 days'), ($1, 'Jo for PauseAI', 'scheduled', '1 day'),
                    ($1, 'Jo, PauseAI UK', 'sent', '2 hours'), ($1, 'Jo', 'sent', '1 hour'), ($1, '', 'sent', '1 hour'),
                    ($1, 'Jo Bl', 'draft', '1 minute'), ('al@pauseai.uk', 'Al', 'sent', '1 hour'))
         v (sender, name, state, ago)`,
      [JO],
    );
    expect(await gmailAccount(JO)).toMatchObject({ names: ["Jo", "Jo, PauseAI UK", "Jo for PauseAI"] });
  });

  it("has none left past the limit", async () => {
    await connectTestGmail(JO);
    await query(
      `INSERT INTO email_sends (purpose, address, outcome, message_id, backend, sender)
       SELECT 'mailing', 'p@example.org', 'sent', 'm' || n, 'gmail', $1 FROM generate_series(1, $2) n`,
      [JO, GMAIL_DAILY_LIMIT + 1],
    );
    expect(await gmailAccount(JO)).toMatchObject({ remaining: 0 });
  });

  it("disconnects: tells Google, forgets the token, and logs it", async () => {
    await connectTestGmail(JO);
    let revoked = "";
    server.use(
      http.post(REVOKE, ({ request }) => {
        revoked = new URL(request.url).searchParams.get("token")!;
        return HttpResponse.json({});
      }),
    );
    expect(await disconnectGmail(JO, "al@pauseai.uk")).toBe(true);
    expect(revoked).toBe("fixture-refresh:jo@pauseai.uk");
    expect(await gmailAccounts()).toEqual([]);
    expect(await audit()).toEqual([
      { actor: "al@pauseai.uk", action: "disconnect gmail", details: { email: JO, why: "disconnected" } },
    ]);
    expect(await disconnectGmail(JO, JO)).toBe(false);
  });

  it("disconnects even when Google won't revoke, and says so in the log", async () => {
    await connectTestGmail(JO);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    server.use(http.post(REVOKE, () => new HttpResponse(null, { status: 500 })));
    expect(await disconnectGmail(JO, JO)).toBe(true);
    await vi.waitFor(() =>
      expect(error).toHaveBeenCalledWith("Couldn't revoke jo@pauseai.uk's Gmail token:", expect.any(Error)),
    );
    expect(await gmailAccounts()).toEqual([]);
  });

  it("keeps an access token until a minute before it expires", async () => {
    await connectTestGmail(JO);
    let asked = 0;
    server.use(
      http.post(TOKEN, () => {
        asked++;
        return HttpResponse.json({ access_token: `a${asked}`, expires_in: asked === 1 ? 30 : 3600 });
      }),
    );
    expect(await gmailAccess(JO)).toBe("a1");
    expect(await gmailAccess(JO)).toBe("a2");
    expect(await gmailAccess(JO)).toBe("a2");
  });

  it("disconnects an account whose access Google has revoked, and refuses one not connected", async () => {
    await connectTestGmail("al@pauseai.uk");
    server.use(http.post(TOKEN, () => HttpResponse.json({ error: "invalid_grant" }, { status: 400 })));
    await expect(gmailAccess("al@pauseai.uk")).rejects.toMatchObject({ revoked: true });
    expect(await gmailAccounts()).toEqual([]);
    expect(await audit()).toEqual([
      { actor: "google", action: "disconnect gmail", details: { email: "al@pauseai.uk", why: "access revoked" } },
    ]);
    await expect(gmailAccess("al@pauseai.uk")).rejects.toThrow("isn't connected");
    await expect(gmailAccess("nobody@pauseai.uk")).rejects.toThrow("isn't connected");
  });

  it("passes on any other failure to get a token, and stays connected", async () => {
    await connectTestGmail("al@pauseai.uk");
    server.use(http.post(TOKEN, () => new HttpResponse(null, { status: 503 })));
    await expect(gmailAccess("al@pauseai.uk")).rejects.toMatchObject({ revoked: false });
    expect(await gmailAccounts()).toHaveLength(1);
  });

  it("keeps where reading each account got to", async () => {
    await connectTestGmail(JO, "5");
    await query("INSERT INTO staff_accounts (email, added_by) VALUES ('samuel.whitlock@pauseai.uk', 'test')");
    await saveHistoryId(JO, "9");
    await saveHistoryId("samuel.whitlock@pauseai.uk", "9");
    expect(await gmailReadingState()).toEqual([{ email: JO, historyId: "9" }]);
  });
});
