import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { moreToSend } from "./more-to-send";
import { SENDING } from "@/lib/staff-time";
import sendMailings, { config } from "./send-mailings";

beforeEach(() => {
  vi.stubEnv("URL", "https://pauseai.uk");
  vi.stubEnv("CRON_SECRET", "s3cret");
});
afterEach(() => vi.unstubAllEnvs());

const RUN = { sent: 0, skipped: 0, failed: 0, left: 0, waiting: [] };
const BACKGROUND = "https://pauseai.uk/.netlify/functions/send-mailings-background";

/** The site answering each call with `run`, and the background function's calls, with their authorisation. */
function site(run: object, background = 202) {
  const calls: (string | null)[] = [];
  server.use(
    http.post("https://pauseai.uk/api/cron/send-mailings", () => HttpResponse.json(run)),
    http.post(BACKGROUND, ({ request }) => {
      calls.push(request.headers.get("authorization"));
      return new HttpResponse(null, { status: background });
    }),
  );
  return calls;
}

describe("the hourly sending function", () => {
  it("runs hourly from 06:18 to 23:18 UTC, and hands on to the background function only while there's more to send", async () => {
    expect(config.schedule).toBe("18 6-23 * * *");
    // What the staff pages say of when a mailing goes.
    expect(config.schedule).toBe(`${SENDING.minute} ${SENDING.firstHour}-23 * * *`);
    expect(site(RUN).length).toBe(0);
    expect(await (await sendMailings()).json()).toEqual(RUN);
    const calls = site({ ...RUN, sent: 7, left: 3 });
    await sendMailings();
    expect(calls).toEqual(["Bearer s3cret"]);
  });

  it("fails loudly if the site does, or the background function won't start", async () => {
    server.use(http.post("https://pauseai.uk/api/cron/send-mailings", () => new HttpResponse("nope", { status: 401 })));
    await expect(sendMailings()).rejects.toThrow("returned 401: nope");
    site({ ...RUN, sent: 1, left: 1 }, 500);
    await expect(sendMailings()).rejects.toThrow("send-mailings-background returned 500");
  });
});

describe("moreToSend", () => {
  it("is while letters are left and the last call sent, skipped or failed some", () => {
    expect(moreToSend({ ...RUN, left: 2, skipped: 1 })).toBe(true);
    expect(moreToSend({ ...RUN, left: 2, failed: 1 })).toBe(true);
    expect(moreToSend({ ...RUN, left: 2 })).toBe(false);
    expect(moreToSend({ ...RUN, sent: 3 })).toBe(false);
  });
});
