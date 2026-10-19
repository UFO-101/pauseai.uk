import { describe as group, expect, it, vi } from "vitest";
import { describe, report, type AlertEnv } from "./alerts.ts";
import type { Outcome } from "./run.ts";

const MANIFEST = { at: "2026-10-19T03:00:00.000Z", key: "dumps/x.dump", bytes: 3, sha256: "abc", tables: {} };
const GOOD: Outcome = { manifest: MANIFEST, problems: [] };
const BAD: Outcome = { problems: ["letters: not in the backup."] };
const EMAIL: AlertEnv = {
  POSTMARK_SERVER_TOKEN: "token",
  ALERT_FROM: "backups@example.org",
  ALERT_TO: "me@example.org",
};

function fakeFetch(status = 200) {
  return vi.fn<typeof fetch>(async () => new Response("reply", { status }));
}

group("report", () => {
  it("pings Healthchecks after a good backup, and emails nobody", async () => {
    const send = fakeFetch();
    await report(GOOD, { ...EMAIL, HEALTHCHECK_URL: "https://hc-ping.com/uuid" }, send);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith("https://hc-ping.com/uuid", { method: "POST", body: describe(GOOD) });
  });

  it("does nothing after a good backup without Healthchecks", async () => {
    const send = fakeFetch();
    await report(GOOD, {}, send);
    expect(send).not.toHaveBeenCalled();
  });

  it("pings Healthchecks's /fail and emails the problems after a bad backup", async () => {
    const send = fakeFetch();
    await report(BAD, { ...EMAIL, HEALTHCHECK_URL: "https://hc-ping.com/uuid" }, send);
    expect(send).toHaveBeenCalledWith("https://hc-ping.com/uuid/fail", { method: "POST", body: describe(BAD) });
    const [url, init] = send.mock.calls[1];
    expect(url).toBe("https://api.postmarkapp.com/email");
    expect((init!.headers as Record<string, string>)["X-Postmark-Server-Token"]).toBe("token");
    expect(JSON.parse(init!.body as string)).toEqual({
      From: "backups@example.org",
      To: "me@example.org",
      Subject: "Database backup: problems",
      TextBody: describe(BAD),
      MessageStream: "outbound",
    });
  });

  it("throws when it can't email the problems", async () => {
    await expect(report(BAD, {}, fakeFetch())).rejects.toThrow(
      "Can't email the problems: POSTMARK_SERVER_TOKEN, ALERT_FROM and ALERT_TO must all be set.",
    );
    await expect(report(BAD, EMAIL, fakeFetch(422))).rejects.toThrow("Postmark replied 422: reply");
  });

  it("throws when Healthchecks refuses the ping", async () => {
    await expect(report(GOOD, { HEALTHCHECK_URL: "https://hc-ping.com/uuid" }, fakeFetch(404))).rejects.toThrow(
      "Healthchecks replied 404.",
    );
  });
});

group("describe", () => {
  it("lists the problems, then the manifest", () => {
    expect(describe(BAD)).toBe("Problems:\n- letters: not in the backup.");
    expect(describe(GOOD)).toBe(`No problems.\n\nManifest:\n${JSON.stringify(MANIFEST, null, 2)}`);
  });
});
