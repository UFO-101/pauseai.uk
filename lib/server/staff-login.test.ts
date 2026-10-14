import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { staffCopy } from "@/lib/content/staff-interface";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { HOURLY_LINKS, isStaffEmail, linkOrigin, sendLoginLink, redeemLoginLink } from "./staff-login";

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

const tokenFrom = (email: Sent) => email.TextBody.match(/\/staff\/login\/confirm\?token=([\w-]+)/)![1];

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
  for (const email of ["jo@gmail.com", "jo@pauseai.uk.evil.example", "jo@notify.pauseai.uk", "jo@evilpauseai.uk", "@pauseai.uk", "jo smith@pauseai.uk", "a@b@pauseai.uk"]) {
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

describeWithDatabase("login links", () => {
  useTestDatabase();

  it("emails a pauseai.uk address a link that logs in once", async () => {
    const sent = postmark();
    await sendLoginLink(" Jo@PauseAI.uk ", "https://evil.example");

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ From: "PauseAI UK <noreply@notify.pauseai.uk>", To: "jo@pauseai.uk", Subject: staffCopy.loginEmail.subject });
    expect(sent[0].TextBody).toContain("https://pauseai.uk/staff/login/confirm?token=");
    const token = tokenFrom(sent[0]);
    // Only a hash of the token is kept.
    expect(JSON.stringify(await query("SELECT * FROM staff_login_links"))).not.toContain(token);

    expect(await redeemLoginLink(token)).toBe("jo@pauseai.uk");
    expect(await redeemLoginLink(token)).toBeUndefined();
    expect(await redeemLoginLink("made-up")).toBeUndefined();
    expect(await redeemLoginLink("")).toBeUndefined();
  });

  it("sends nothing to anyone else, or without an address to link to", async () => {
    const sent = postmark();
    await sendLoginLink("jo@gmail.com", "https://pauseai.uk");
    vi.stubEnv("SITE_ORIGIN", "");
    await sendLoginLink("jo@pauseai.uk", "https://evil.example");
    expect(sent).toEqual([]);
    expect(await query("SELECT * FROM staff_login_links")).toEqual([]);
  });

  it("lets a link expire after 15 minutes", async () => {
    const sent = postmark();
    await sendLoginLink("jo@pauseai.uk", "");
    const [{ minutes }] = await query<{ minutes: number }>("SELECT round(extract(epoch FROM expires_at - created_at) / 60)::int AS minutes FROM staff_login_links");
    expect(minutes).toBe(15);
    await query("UPDATE staff_login_links SET expires_at = now() - interval '1 second'");
    expect(await redeemLoginLink(tokenFrom(sent[0]))).toBeUndefined();
  });

  it("sends at most five links an hour to one address, and clears out old ones", async () => {
    const sent = postmark();
    await query("INSERT INTO staff_login_links (token_hash, email, created_at, expires_at) VALUES ('old', 'x@pauseai.uk', now() - interval '2 days', now())");
    for (let i = 0; i <= HOURLY_LINKS; i++) await sendLoginLink(i % 2 ? "JO@pauseai.uk" : "jo@pauseai.uk", "");
    await sendLoginLink("sam@pauseai.uk", "");
    expect(sent.map((e) => e.To)).toEqual([...Array(HOURLY_LINKS).fill("jo@pauseai.uk"), "sam@pauseai.uk"]);
    expect(await query("SELECT 1 FROM staff_login_links WHERE token_hash = 'old'")).toEqual([]);

    await query("UPDATE staff_login_links SET created_at = now() - interval '61 minutes'");
    await sendLoginLink("jo@pauseai.uk", "");
    expect(sent).toHaveLength(HOURLY_LINKS + 2);
  });

  it("keeps no link it couldn't send", async () => {
    postmark(() => HttpResponse.json({ ErrorCode: 300, Message: "Invalid" }, { status: 422 }));
    await sendLoginLink("jo@pauseai.uk", "");
    expect(await query("SELECT * FROM staff_login_links")).toEqual([]);
  });
});
