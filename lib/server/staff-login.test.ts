import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { staffCopy } from "@/lib/content/staff-interface";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import {
  HOURLY_LINKS,
  isStaffEmail,
  linkOrigin,
  loginBrowser,
  loginBrowserCookie,
  sendLoginLink,
  redeemLoginLink,
} from "./staff-login";

const POSTMARK = "https://api.postmarkapp.com/email";
type Sent = { From: string; To: string; Subject: string; TextBody: string };

/** Records each email sent through Postmark. */
function postmark(answer: () => Response = () => HttpResponse.json({ ErrorCode: 0, MessageID: "m" })) {
  const sent: Sent[] = [];
  server.use(
    http.post(POSTMARK, async ({ request }) => {
      sent.push((await request.json()) as Sent);
      return answer();
    }),
  );
  return sent;
}

const tokenFrom = (email: Sent) => email.TextBody.match(/\/staff\/api\/callback\?token=([\w-]+)/)![1];

/** The browser that asks for the links, and another one. */
const BROWSER = loginBrowser(undefined);
const OTHER_BROWSER = loginBrowser(undefined);

beforeEach(() => {
  vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
  vi.stubEnv("SITE_ORIGIN", "https://pauseai.uk");
  vi.stubEnv("DEPLOY_CONTEXT", "production");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("knows a pauseai.uk address, and nothing else", () => {
  for (const email of ["jo@pauseai.uk", "Jo.Bloggs+x@PauseAI.uk"]) expect(isStaffEmail(email), email).toBe(true);
  for (const email of [
    "jo@gmail.com",
    "jo@pauseai.uk.evil.example",
    "jo@notify.pauseai.uk",
    "jo@evilpauseai.uk",
    "@pauseai.uk",
    "jo smith@pauseai.uk",
    "a@b@pauseai.uk",
  ]) {
    expect(isStaffEmail(email), email).toBe(false);
  }
});

it("points links at the deploy's own address, never the request's, except in a local build", () => {
  expect(linkOrigin("https://evil.example")).toBe("https://pauseai.uk");
  vi.stubEnv("SITE_ORIGIN", "");
  expect(linkOrigin("https://evil.example")).toBeUndefined();
  vi.stubEnv("DEPLOY_CONTEXT", "local");
  expect(linkOrigin("http://localhost:3000")).toBe("http://localhost:3000");
});

it("keeps a browser's token from an earlier request, and otherwise makes a new one", () => {
  expect(BROWSER).toMatch(/^[\w-]{43}$/);
  expect(OTHER_BROWSER).not.toBe(BROWSER);
  expect(loginBrowser(BROWSER)).toBe(BROWSER);
  for (const bad of ["", "short", `${BROWSER};x`]) expect(loginBrowser(bad)).toMatch(/^[\w-]{43}$/);
  expect(loginBrowser("short")).not.toBe("short");
});

it("marks the browser with a cookie that lasts as long as the link, only under /staff", () => {
  expect(loginBrowserCookie(BROWSER)).toEqual({
    name: "staff_login",
    value: BROWSER,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/staff",
    maxAge: 15 * 60,
  });
});

describeWithDatabase("login links", () => {
  useTestDatabase();

  it("emails a pauseai.uk address a link that logs in once", async () => {
    const sent = postmark();
    await sendLoginLink(" Jo@PauseAI.uk ", "https://evil.example", BROWSER);

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      From: "PauseAI UK staff login <noreply@notify.pauseai.uk>",
      To: "jo@pauseai.uk",
      Subject: staffCopy.loginEmail.subject,
    });
    expect(sent[0].TextBody).toContain("https://pauseai.uk/staff/api/callback?token=");
    const token = tokenFrom(sent[0]);
    // Only hashes of the link's and the browser's tokens are kept.
    const rows = JSON.stringify(await query("SELECT * FROM staff_login_links"));
    expect(rows).not.toContain(token);
    expect(rows).not.toContain(BROWSER);

    expect(await redeemLoginLink(token, BROWSER)).toEqual({ email: "jo@pauseai.uk" });
    expect(await redeemLoginLink(token, BROWSER)).toEqual({ refused: "failed" });
    expect(await redeemLoginLink("made-up", BROWSER)).toEqual({ refused: "failed" });
    expect(await redeemLoginLink("", BROWSER)).toEqual({ refused: "failed" });
  });

  it("works only in the browser that asked, and isn't used up anywhere else", async () => {
    const sent = postmark();
    await sendLoginLink("jo@pauseai.uk", "", BROWSER);
    const token = tokenFrom(sent[0]);

    expect(await redeemLoginLink(token, OTHER_BROWSER)).toEqual({ refused: "elsewhere" });
    expect(await redeemLoginLink(token, "")).toEqual({ refused: "elsewhere" });
    expect(await redeemLoginLink(token, BROWSER)).toEqual({ email: "jo@pauseai.uk" });
  });

  it("sends nothing to anyone else, or without an address to link to", async () => {
    const sent = postmark();
    await sendLoginLink("jo@gmail.com", "https://pauseai.uk", BROWSER);
    vi.stubEnv("SITE_ORIGIN", "");
    await sendLoginLink("jo@pauseai.uk", "https://evil.example", BROWSER);
    expect(sent).toEqual([]);
    expect(await query("SELECT * FROM staff_login_links")).toEqual([]);
  });

  it("lets a link expire after 15 minutes", async () => {
    const sent = postmark();
    await sendLoginLink("jo@pauseai.uk", "", BROWSER);
    const [{ minutes }] = await query<{ minutes: number }>(
      "SELECT round(extract(epoch FROM expires_at - created_at) / 60)::int AS minutes FROM staff_login_links",
    );
    expect(minutes).toBe(15);
    await query("UPDATE staff_login_links SET expires_at = now() - interval '1 second'");
    expect(await redeemLoginLink(tokenFrom(sent[0]), BROWSER)).toEqual({ refused: "failed" });
  });

  it("sends at most five links an hour to one address, and clears out old ones", async () => {
    const sent = postmark();
    await query(
      "INSERT INTO staff_login_links (token_hash, email, created_at, expires_at) VALUES ('old', 'x@pauseai.uk', now() - interval '2 days', now())",
    );
    for (let i = 0; i <= HOURLY_LINKS; i++) await sendLoginLink(i % 2 ? "JO@pauseai.uk" : "jo@pauseai.uk", "", BROWSER);
    await sendLoginLink("sam@pauseai.uk", "", BROWSER);
    expect(sent.map((e) => e.To)).toEqual([...Array(HOURLY_LINKS).fill("jo@pauseai.uk"), "sam@pauseai.uk"]);
    expect(await query("SELECT 1 FROM staff_login_links WHERE token_hash = 'old'")).toEqual([]);

    await query("UPDATE staff_login_links SET created_at = now() - interval '61 minutes'");
    await sendLoginLink("jo@pauseai.uk", "", BROWSER);
    expect(sent).toHaveLength(HOURLY_LINKS + 2);
  });

  it("keeps no link it couldn't send", async () => {
    postmark(() => HttpResponse.json({ ErrorCode: 300, Message: "Invalid" }, { status: 422 }));
    await sendLoginLink("jo@pauseai.uk", "", BROWSER);
    expect(await query("SELECT * FROM staff_login_links")).toEqual([]);
  });
});
