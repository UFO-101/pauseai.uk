import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { headerName, PostmarkError, sendEmail } from "./postmark";

const POSTMARK = "https://api.postmarkapp.com/email";
const EMAIL = { From: "a@letters.pauseai.uk", To: "b@example.org", Subject: "S", TextBody: "T" };

beforeEach(() => vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token"));
afterEach(() => vi.unstubAllEnvs());

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
