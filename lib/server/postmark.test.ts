import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { readOutbox } from "@/tests/fixtures/outbox";
import { server } from "@/tests/fixtures/msw";
import { headerName, PostmarkError, sendEmail } from "./postmark";

const POSTMARK = "https://api.postmarkapp.com/email";
const EMAIL = { From: "a@letters.pauseai.uk", To: "b@example.org", Subject: "S", TextBody: "T" };

beforeEach(() => vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token"));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendEmail", () => {
  it("posts the email to Postmark's transactional stream, and returns the MessageID", async () => {
    let request: Request | undefined;
    server.use(
      http.post(POSTMARK, ({ request: r }) => {
        request = r.clone();
        return HttpResponse.json({ ErrorCode: 0, MessageID: "msg-1" });
      }),
    );
    expect(await sendEmail(EMAIL)).toBe("msg-1");
    expect(request!.headers.get("X-Postmark-Server-Token")).toBe("server-token");
    expect(await request!.json()).toEqual({ ...EMAIL, MessageStream: "outbound" });
  });

  it("works with the fixture Postmark", async () => {
    expect(await sendEmail(EMAIL)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("needs no token with fixtures on", async () => {
    vi.stubEnv("POSTMARK_SERVER_TOKEN", "");
    vi.stubEnv("DATA_FIXTURES", "1");
    expect(await sendEmail(EMAIL)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("in the dev server without a real token, writes the email to the outbox instead of asking Postmark, and says so", async () => {
    const dir = mkdtempSync(join(tmpdir(), "outbox-"));
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("OUTBOX_DIR", dir);
    server.use(http.post(POSTMARK, () => HttpResponse.error()));
    try {
      vi.stubEnv("POSTMARK_SERVER_TOKEN", "");
      expect(await sendEmail({ ...EMAIL, Tag: "staff-login" })).toMatch(/^[0-9a-f-]{36}$/);
      vi.stubEnv("POSTMARK_SERVER_TOKEN", "POSTMARK_API_TEST");
      await sendEmail(EMAIL);
      expect(readOutbox(dir).map((e) => e.To)).toEqual(["b@example.org", "b@example.org"]);
      const files = readdirSync(dir).sort();
      expect(info.mock.calls.map(([line]) => line)).toEqual([
        `Email "staff-login" to an address at example.org: not sent, as POSTMARK_SERVER_TOKEN isn't set. Written to ${join(dir, files[0])} instead.`,
        `Email to an address at example.org: not sent, as POSTMARK_SERVER_TOKEN is Postmark's test token. Written to ${join(dir, files[1])} instead.`,
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("in the dev server, uses tmp/outbox when OUTBOX_DIR isn't set, and treats a missing token like an empty one", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("OUTBOX_DIR", "");
    vi.stubEnv("POSTMARK_SERVER_TOKEN", undefined);
    await sendEmail(EMAIL);
    const file = String(info.mock.calls[0][0]).match(/Written to (\S+\.eml) instead/)![1];
    try {
      expect(file.startsWith(join("tmp", "outbox"))).toBe(true);
      expect(info.mock.calls[0][0]).toContain("not sent, as POSTMARK_SERVER_TOKEN isn't set");
    } finally {
      rmSync(file, { force: true });
    }
  });

  it("with fixtures on, writes the email to the outbox if there is one", async () => {
    const dir = mkdtempSync(join(tmpdir(), "outbox-"));
    vi.stubEnv("DATA_FIXTURES", "1");
    vi.stubEnv("OUTBOX_DIR", dir);
    try {
      await sendEmail(EMAIL);
      expect(readOutbox(dir).map((e) => e.Subject)).toEqual(["S"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("logs nothing in unit tests, and says what happened elsewhere", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    server.use(http.post(POSTMARK, () => HttpResponse.json({ ErrorCode: 0, MessageID: "msg-1" })));
    await sendEmail(EMAIL);
    expect(info).not.toHaveBeenCalled();
    vi.stubEnv("NODE_ENV", "production");
    await sendEmail({ ...EMAIL, Tag: "staff-login" });
    vi.stubEnv("POSTMARK_SERVER_TOKEN", "POSTMARK_API_TEST");
    await sendEmail(EMAIL);
    vi.stubEnv("DATA_FIXTURES", "1");
    vi.stubEnv("OUTBOX_DIR", "");
    await sendEmail(EMAIL);
    expect(info.mock.calls.map(([line]) => line)).toEqual([
      'Email "staff-login" to an address at example.org: sent through Postmark, MessageID msg-1',
      "Email to an address at example.org: not sent, as POSTMARK_SERVER_TOKEN is Postmark's test token.",
      "Email to an address at example.org: not sent, as DATA_FIXTURES=1. There's no outbox, so it isn't saved anywhere either.",
    ]);
  });

  it("throws when Postmark refuses, answers oddly, or there's no token", async () => {
    server.use(http.post(POSTMARK, () => HttpResponse.json({ ErrorCode: 406, Message: "Inactive recipient" }, { status: 422 })));
    await expect(sendEmail(EMAIL)).rejects.toThrow("422 406 Inactive recipient");
    server.use(http.post(POSTMARK, () => HttpResponse.json({ ErrorCode: 0 })));
    await expect(sendEmail(EMAIL)).rejects.toThrow(PostmarkError);
    server.use(http.post(POSTMARK, () => new HttpResponse("not json", { status: 500 })));
    await expect(sendEmail(EMAIL)).rejects.toThrow("Postmark refused the email: 500");
    vi.stubEnv("POSTMARK_SERVER_TOKEN", "");
    await expect(sendEmail(EMAIL)).rejects.toThrow("POSTMARK_SERVER_TOKEN is not set");
  });
});

describe("headerName", () => {
  it("removes what could break out of a From header", () => {
    expect(headerName(' Jane "J" <Smith>\r\nBcc: x\\ ')).toBe("Jane J SmithBcc: x");
  });
});
