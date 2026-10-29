import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { readOutbox } from "@/tests/fixtures/outbox";
import { parseMime } from "../mime";
import {
  exchangeGmailCode,
  gmailAccessToken,
  gmailConsentUrl,
  GmailError,
  gmailHistory,
  gmailMessageHeaders,
  gmailProfile,
  gmailSendName,
  gmailRawMessage,
  revokeGmail,
  searchGmail,
  sendGmail,
} from "./gmail";

const API = "https://gmail.googleapis.com/gmail/v1/users/me";
const TOKEN = "https://oauth2.googleapis.com/token";
const EMAIL = {
  From: '"Jo" <jo@pauseai.uk>',
  To: '"Polly" <polly@example.org>',
  Subject: "Hello",
  TextBody: "Hi",
  MessageId: "m1@pauseai.uk",
  Date: new Date("2026-11-02T10:00:00Z"),
};

beforeEach(() => {
  vi.stubEnv("GOOGLE_CLIENT_ID", "client-id");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret");
});
afterEach(() => vi.unstubAllEnvs());

describe("consent", () => {
  it("asks Google for sending and reading, offline, for the account, coming back with the state", () => {
    const url = new URL(gmailConsentUrl("jo@pauseai.uk", "https://pauseai.uk/staff/api/gmail/callback", "st"));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: "client-id",
      redirect_uri: "https://pauseai.uk/staff/api/gmail/callback",
      response_type: "code",
      scope: "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly",
      access_type: "offline",
      prompt: "consent",
      login_hint: "jo@pauseai.uk",
      state: "st",
    });
  });

  it("with fixtures, comes straight back with a code naming the account, and needs no client", () => {
    vi.stubEnv("DATA_FIXTURES", "1");
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    expect(gmailConsentUrl("jo@pauseai.uk", "https://pauseai.uk/cb", "st")).toBe(
      "https://pauseai.uk/cb?code=fixture%3Ajo%40pauseai.uk&state=st",
    );
  });

  it("needs the client's ID and secret, but for fixtures", async () => {
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    expect(() => gmailConsentUrl("jo@pauseai.uk", "https://pauseai.uk/cb", "st")).toThrow(GmailError);
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret");
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    expect(() => gmailConsentUrl("jo@pauseai.uk", "https://pauseai.uk/cb", "st")).toThrow("aren't set");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    vi.stubEnv("DATA_FIXTURES", "1");
    expect(await gmailAccessToken("fixture-refresh:jo@pauseai.uk")).toMatchObject({
      token: "fixture-access:jo@pauseai.uk",
    });
  });
});

describe("tokens", () => {
  it("trades a code for a refresh token, with the client's secret", async () => {
    let form: URLSearchParams | undefined;
    server.use(
      http.post(TOKEN, async ({ request }) => {
        form = new URLSearchParams(await request.text());
        return HttpResponse.json({ access_token: "a", refresh_token: "r", expires_in: 3599 });
      }),
    );
    expect(await exchangeGmailCode("code-1", "https://pauseai.uk/cb")).toBe("r");
    expect(Object.fromEntries(form!)).toEqual({
      code: "code-1",
      redirect_uri: "https://pauseai.uk/cb",
      grant_type: "authorization_code",
      client_id: "client-id",
      client_secret: "client-secret",
    });
  });

  it("refuses an answer with no refresh token", async () => {
    server.use(http.post(TOKEN, () => HttpResponse.json({ access_token: "a" })));
    await expect(exchangeGmailCode("c", "https://pauseai.uk/cb")).rejects.toThrow("gave no refresh token");
  });

  it("gets an access token from a refresh token, an hour's if Google doesn't say", async () => {
    expect(await gmailAccessToken("fixture-refresh:jo@pauseai.uk")).toEqual({
      token: "fixture-access:jo@pauseai.uk",
      expiresIn: 3599,
    });
    server.use(http.post(TOKEN, () => HttpResponse.json({ access_token: "a" })));
    expect(await gmailAccessToken("r")).toEqual({ token: "a", expiresIn: 3600 });
  });

  it("says a refresh token was revoked when Google calls it an invalid grant", async () => {
    server.use(http.post(TOKEN, () => HttpResponse.json({ error: "invalid_grant" }, { status: 400 })));
    const error = await gmailAccessToken("r").catch((e: GmailError) => e);
    expect(error).toMatchObject({
      revoked: true,
      status: 400,
      message: "Google refused the token request: 400 invalid_grant",
    });
    server.use(http.post(TOKEN, () => new HttpResponse("down", { status: 503 })));
    expect(await gmailAccessToken("r").catch((e: GmailError) => e)).toMatchObject({ revoked: false, status: 503 });
  });

  it("revokes a token, minding only an answer that isn't Google's no-such-token", async () => {
    await expect(revokeGmail("r")).resolves.toBeUndefined();
    server.use(http.post("https://oauth2.googleapis.com/revoke", () => new HttpResponse(null, { status: 400 })));
    await expect(revokeGmail("r")).resolves.toBeUndefined();
    server.use(http.post("https://oauth2.googleapis.com/revoke", () => new HttpResponse(null, { status: 500 })));
    await expect(revokeGmail("r")).rejects.toThrow("refused to revoke");
  });
});

describe("the Gmail API", () => {
  it("reads the account's profile with its access token", async () => {
    expect(await gmailProfile("fixture-access:jo@pauseai.uk")).toEqual({
      emailAddress: "jo@pauseai.uk",
      historyId: "1000",
    });
  });

  it("sends the email as MIME, in base64url", async () => {
    let raw = "";
    server.use(
      http.post(`${API}/messages/send`, async ({ request }) => {
        raw = Buffer.from(((await request.json()) as { raw: string }).raw, "base64url").toString();
        return HttpResponse.json({ id: "g1", threadId: "t1" });
      }),
    );
    expect(await sendGmail("tok", EMAIL)).toEqual({ id: "g1", threadId: "t1" });
    expect(parseMime(raw).headers.get("message-id")).toBe("<m1@pauseai.uk>");
  });

  it("with fixtures, writes what it sends to the outbox too", async () => {
    const dir = mkdtempSync(join(tmpdir(), "outbox-"));
    try {
      vi.stubEnv("DATA_FIXTURES", "1");
      vi.stubEnv("OUTBOX_DIR", dir);
      expect(await sendGmail("fixture-access:jo@pauseai.uk", EMAIL)).toMatchObject({ labelIds: ["SENT"] });
      expect(readOutbox(dir)).toMatchObject([{ To: '"Polly" <polly@example.org>', Subject: "Hello" }]);
      vi.stubEnv("OUTBOX_DIR", "");
      await sendGmail("fixture-access:jo@pauseai.uk", EMAIL);
      expect(readOutbox(dir)).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("gives the name the account's own address sends as, or none when it has none", async () => {
    server.use(
      http.get(`${API}/settings/sendAs`, () =>
        HttpResponse.json({
          sendAs: [
            { sendAsEmail: "alias@pauseai.uk", displayName: "An alias" },
            { sendAsEmail: "jo@pauseai.uk", displayName: "Jo Staff", isPrimary: true },
          ],
        }),
      ),
    );
    expect(await gmailSendName("tok")).toBe("Jo Staff");
    server.use(
      http.get(`${API}/settings/sendAs`, () =>
        HttpResponse.json({ sendAs: [{ sendAsEmail: "jo@pauseai.uk", isPrimary: true }] }),
      ),
    );
    expect(await gmailSendName("tok")).toBe("");
  });

  it("says what Gmail refused", async () => {
    server.use(http.get(`${API}/profile`, () => new HttpResponse(null, { status: 401 })));
    await expect(gmailProfile("tok")).rejects.toMatchObject({
      status: 401,
      message: "Gmail answered 401 for /profile",
    });
  });

  it("lists the messages added since a history ID, page by page, each once", async () => {
    const asked: string[] = [];
    server.use(
      http.get(`${API}/history`, ({ request }) => {
        const params = new URL(request.url).searchParams;
        asked.push(params.toString());
        return params.get("pageToken")
          ? HttpResponse.json({ history: [{ messagesAdded: [{ message: { id: "b" } }] }, {}], historyId: "12" })
          : HttpResponse.json({
              history: [{ messagesAdded: [{ message: { id: "a" } }, { message: { id: "b" } }] }],
              nextPageToken: "p2",
              historyId: "11",
            });
      }),
    );
    expect(await gmailHistory("tok", "10")).toEqual({ messageIds: ["a", "b"], historyId: "12" });
    expect(asked).toEqual([
      "startHistoryId=10&historyTypes=messageAdded",
      "startHistoryId=10&historyTypes=messageAdded&pageToken=p2",
    ]);
    expect(await gmailHistory("tok", "10")).toBeDefined();
  });

  it("says when the history is gone, and passes on other failures", async () => {
    expect(await gmailHistory("tok", "10")).toEqual({ messageIds: [], historyId: "1000" });
    server.use(http.get(`${API}/history`, () => new HttpResponse(null, { status: 404 })));
    expect(await gmailHistory("tok", "10")).toBeUndefined();
    server.use(http.get(`${API}/history`, () => new HttpResponse(null, { status: 500 })));
    await expect(gmailHistory("tok", "10")).rejects.toThrow("Gmail answered 500");
  });

  it("fetches only the headers asked for, by lowercased name", async () => {
    let asked = "";
    server.use(
      http.get(`${API}/messages/m1`, ({ request }) => {
        asked = new URL(request.url).search;
        return HttpResponse.json({
          id: "m1",
          threadId: "t1",
          labelIds: ["INBOX"],
          internalDate: "1793000000000",
          payload: { headers: [{ name: "In-Reply-To", value: "<x@pauseai.uk>" }] },
        });
      }),
    );
    expect(await gmailMessageHeaders("tok", "m1", ["In-Reply-To", "From"])).toEqual({
      id: "m1",
      threadId: "t1",
      labelIds: ["INBOX"],
      internalDate: "1793000000000",
      headers: new Map([["in-reply-to", "<x@pauseai.uk>"]]),
    });
    expect(asked).toBe("?format=metadata&metadataHeaders=In-Reply-To&metadataHeaders=From");
    server.use(
      http.get(`${API}/messages/m2`, () => HttpResponse.json({ id: "m2", threadId: "t2", internalDate: "1" })),
    );
    expect(await gmailMessageHeaders("tok", "m2", [])).toMatchObject({ labelIds: [], headers: new Map() });
  });

  it("fetches a whole message", async () => {
    server.use(
      http.get(`${API}/messages/m1`, () =>
        HttpResponse.json({ raw: Buffer.from("Subject: hi").toString("base64url") }),
      ),
    );
    expect((await gmailRawMessage("tok", "m1")).toString()).toBe("Subject: hi");
  });

  it("searches", async () => {
    expect(await searchGmail("tok", "from:mailer-daemon")).toEqual([]);
    let asked = "";
    server.use(
      http.get(`${API}/messages`, ({ request }) => {
        asked = new URL(request.url).search;
        return HttpResponse.json({ messages: [{ id: "a" }, { id: "b" }] });
      }),
    );
    expect(await searchGmail("tok", "newer_than:3d", 500)).toEqual(["a", "b"]);
    expect(asked).toBe("?q=newer_than%3A3d&maxResults=500");
  });
});
