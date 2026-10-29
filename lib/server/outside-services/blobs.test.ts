import { gunzipSync, gzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { letterReply, saveLetterReply } from "./blobs";

beforeEach(() => vi.stubEnv("DATA_FIXTURES", "1"));
afterEach(() => vi.unstubAllEnvs());

describe("Netlify Blobs", () => {
  it("keeps a reply and gives it back, byte for byte", async () => {
    const gzipped = gzipSync("Subject: Re: AI safety\r\n\r\nThanks.");
    await saveLetterReply("jo@pauseai.uk/m1.eml.gz", gzipped);
    expect((await letterReply("jo@pauseai.uk/m1.eml.gz"))!.equals(gzipped)).toBe(true);
    expect(await letterReply("jo@pauseai.uk/none.eml.gz")).toBeUndefined();
  });

  it("reads a fixture database's replies from the fixtures' folder", async () => {
    const reply = await letterReply("fixture/polly-thanks.eml.gz");
    expect(gunzipSync(reply!).toString()).toContain("From: Polly Placeholder");
  });

  it("asks the deploy's own store, with the credentials Netlify gives", async () => {
    vi.stubEnv("DATA_FIXTURES", "");
    vi.stubEnv(
      "NETLIFY_BLOBS_CONTEXT",
      Buffer.from(JSON.stringify({ edgeURL: "https://blobs.example.net", siteID: "site", token: "tok" })).toString(
        "base64",
      ),
    );
    let auth: string | null = null;
    server.use(
      http.get("https://blobs.example.net/site/site:letter-replies/k.eml.gz", ({ request }) => {
        auth = request.headers.get("authorization");
        return new HttpResponse(new Uint8Array([1, 2]));
      }),
    );
    expect([...(await letterReply("k.eml.gz"))!]).toEqual([1, 2]);
    expect(auth).toBe("Bearer tok");
  });
});
