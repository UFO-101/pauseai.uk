import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readOutbox, recordOutgoing } from "./outbox";

let dir: string | undefined;
afterEach(() => {
  vi.unstubAllEnvs();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe("the test outbox", () => {
  it("keeps each email sent through Postmark, in order", () => {
    dir = join(mkdtempSync(join(tmpdir(), "outbox-")), "inner");
    vi.stubEnv("OUTBOX_DIR", dir);
    recordOutgoing("https://api.postmarkapp.com/email", { method: "POST", body: JSON.stringify({ n: 1 }) });
    recordOutgoing("https://api.postmarkapp.com/email", { method: "POST", body: JSON.stringify({ n: 2 }) });
    recordOutgoing("https://api.postcodes.io/postcodes/x", { method: "POST", body: "{}" });
    recordOutgoing("https://api.postmarkapp.com/email");
    expect(readOutbox(dir)).toEqual([{ n: 1 }, { n: 2 }]);
  });

  it("keeps nothing without OUTBOX_DIR, and reads an outbox that isn't there as empty", () => {
    vi.stubEnv("OUTBOX_DIR", "");
    recordOutgoing("https://api.postmarkapp.com/email", { body: "{}" });
    expect(readOutbox(join(tmpdir(), "no-such-outbox"))).toEqual([]);
  });
});
