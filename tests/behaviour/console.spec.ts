import { test, expect, type ConsoleMessage } from "@playwright/test";

// Hydration mismatches are silent by design here: app/layout.tsx sets
// suppressHydrationWarning on both <html> and <body>, which hides the warning
// that would otherwise announce one. Meanwhile app/page.tsx shuffles the hero
// photos on the server on every render, and components/EventList.tsx computes
// "Happening today" after mount specifically to avoid a day-boundary mismatch.
// So the conditions for one exist and the usual alarm is muted.
//
// This sweep fails on console errors and on React's hydration messages, which
// arrive as warnings and would otherwise be filtered out with the noise.

const BASE = process.env.LOCAL_URL ?? "http://localhost:3000";

// A representative spread rather than every route: the homepage (heaviest, and
// the one with the server-side shuffle), the two embed-bearing pages, the
// data-visualisation page (most client JS), and a content page.
const ROUTES = ["/", "/campaigns", "/donate", "/global-ai-sentiment-2026", "/people"];

// Matched against the message text. Kept deliberately short — every entry here
// is a thing we have decided not to look at, so it should have a reason.
const IGNORED = [
  // next/image complains when CSS sizes one dimension; cosmetic, and a warning
  // rather than an error in any case.
  /has either width or height modified/,
  // Analytics and third-party embeds fail in a sandboxed browser with no
  // consent state and nothing to report to. Not our code, not our bug.
  /googletagmanager|google-analytics|gtag/i,
  /ERR_BLOCKED_BY_CLIENT|ERR_INTERNET_DISCONNECTED/,
];

const HYDRATION = /hydrat|did not match|server rendered HTML/i;

function describeMessage(route: string, message: ConsoleMessage): string {
  return `${route} [${message.type()}] ${message.text().slice(0, 300)}`;
}

for (const route of ROUTES) {
  test(`${route} loads without console errors`, async ({ page }) => {
    const problems: string[] = [];

    page.on("console", (message) => {
      // Only our own code is in scope. Embedded third parties log into the same
      // page — and which ones are present varies by environment: without
      // AIRTABLE_TOKEN, /campaigns renders the Airtable iframe rather than the
      // server-rendered list, so CI sees frames a local run with a token does
      // not. Their noise is not a signal about this codebase.
      const origin = message.location().url;
      if (origin && !origin.startsWith(BASE)) return;

      const text = message.text();
      if (IGNORED.some((pattern) => pattern.test(text))) return;
      const isError = message.type() === "error";
      const isHydration = HYDRATION.test(text);
      if (isError || isHydration) problems.push(describeMessage(route, message));
    });
    page.on("pageerror", (error) => {
      problems.push(`${route} [pageerror] ${String(error).slice(0, 300)}`);
    });

    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => getComputedStyle(document.documentElement).getPropertyValue("--site-header-h").trim() !== "",
      undefined,
      { polling: 200, timeout: 20_000 },
    );
    // Hydration warnings arrive shortly after mount, not at load.
    await page.waitForTimeout(2500);

    expect(problems, `console problems on ${route}`).toEqual([]);
  });
}
