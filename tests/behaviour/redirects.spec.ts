import { test, expect } from "@playwright/test";

// Every redirect in next.config.ts exists because a link that other people
// control was already broken once: story permalinks shared before the /stories
// → /people rename, a backlink with a space in the PDF filename, a crawled URL
// that concatenated the destination onto itself. Nothing else asserts they
// still resolve, and the matching is subtle enough (percent-encoding, escaped
// colons, Next collapsing repeated slashes) that a framework upgrade could
// quietly change it.
//
// These run over HTTP with no browser, so they cost milliseconds.

const BASE = process.env.LOCAL_URL ?? "http://localhost:3000";

const REDIRECTS = [
  {
    name: "the stories section rename",
    from: "/stories",
    to: "/people",
  },
  {
    // A real slug, so the follow-through check below lands on a real page
    // rather than a 404 that would pass the redirect but fail the user.
    name: "a shared story permalink",
    from: "/stories/harry-turnbull",
    to: "/people/harry-turnbull",
  },
  {
    name: "a backlink with a space in the PDF filename",
    from: "/pdfs/Donor%20Prospectus.pdf",
    to: "/pdfs/Donor-Prospectus.pdf",
  },
  {
    name: "a crawled URL with the destination concatenated onto itself",
    from: "/global-ai-sentiment-2026https:/pauseai.uk/global-ai-sentiment-2026",
    to: "/global-ai-sentiment-2026",
  },
];

test.describe("redirects", () => {
  for (const { name, from, to } of REDIRECTS) {
    test(`${name}: ${from}`, async ({ request }) => {
      const res = await request.get(`${BASE}${from}`, { maxRedirects: 0 });

      expect(res.status(), `${from} should be a permanent redirect`).toBe(308);
      expect(res.headers()["location"]).toBe(to);
    });
  }

  test("the destinations actually resolve", async ({ request }) => {
    // A redirect pointing at a 404 is no better than the broken link it
    // replaced, so follow each one to the end.
    for (const { from, to } of REDIRECTS) {
      const res = await request.get(`${BASE}${from}`);
      expect(res.status(), `${from} → ${to} does not resolve`).toBe(200);
    }
  });
});
