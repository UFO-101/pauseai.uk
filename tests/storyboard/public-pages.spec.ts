import type { ConsoleMessage } from "@playwright/test";
import { isStaffRoute } from "../../app/sitemap";
import { ROUTES } from "../routes";
import { BASE, expect, frame, test } from "./fixtures";

// Every public page on the site (tests/routes.ts), loaded in a real browser
// against the production build, and pictured. This is the gate for page.tsx
// and layout.tsx, which sit outside the Vitest coverage report
// (docs/testing.md). The staff pages are in staff.spec.ts, after logging in.
//
// Hydration mismatches are silent by design here: app/layout.tsx sets
// suppressHydrationWarning on both <html> and <body>, which hides the warning
// that would otherwise announce one. Meanwhile app/(site)/page.tsx shuffles the hero
// photos on the server on every render, and components/events/EventList.tsx computes
// "Happening today" after mount specifically to avoid a day-boundary mismatch.
// So the conditions for one exist and the usual alarm is muted. This fails on
// console errors and on React's hydration messages, which arrive as warnings.

const PUBLIC_ROUTES = ROUTES.filter((route) => !isStaffRoute(route));

// Matched against the message text. Kept deliberately short — every entry here
// is a thing we have decided not to look at, so it should have a reason.
const IGNORED = [
  // next/image complains when CSS sizes one dimension; cosmetic, and a warning
  // rather than an error in any case.
  /has either width or height modified/,
  // Analytics is blocked for every flow (fixtures.ts), and third-party embeds
  // fail in a sandboxed browser with nothing to report to. Not our code.
  /googletagmanager|google-analytics|gtag/i,
  /ERR_BLOCKED_BY_CLIENT|ERR_INTERNET_DISCONNECTED/,
];

const HYDRATION = /hydrat|did not match|server rendered HTML/i;

// Text a page shows only when it really renders tests/fixtures rather than
// the live APIs, so the other flows are checking a known state.
const FIXTURE_TEXT: Record<string, string> = {
  "/events": "PauseAI London: Protest at Parliament",
  "/manchester": "PauseAI Manchester Social",
};

// Same-site links already checked by an earlier page in this worker.
const checkedLinks = new Map<string, number>();

for (const route of PUBLIC_ROUTES) {
  test(route, { tag: route === "/" ? "@phone" : [] }, async ({ page, request }) => {
    const problems: string[] = [];

    page.on("console", (message: ConsoleMessage) => {
      // Only our own code is in scope: embedded third parties log into the
      // same page, and their noise is not a signal about this codebase.
      const origin = message.location().url;
      if (origin && !origin.startsWith(BASE)) return;
      const text = message.text();
      if (IGNORED.some((pattern) => pattern.test(text))) return;
      if (message.type() === "error" || HYDRATION.test(text)) {
        problems.push(`[${message.type()}] ${text.slice(0, 300)}`);
      }
    });
    page.on("pageerror", (error) => problems.push(`[pageerror] ${String(error).slice(0, 300)}`));

    const response = await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    expect(response?.status(), "status").toBe(200);

    await page.waitForFunction(
      () =>
        getComputedStyle(document.documentElement).getPropertyValue("--site-header-h").trim() !== "" ||
        !document.querySelector("header.site-header"),
      undefined,
      { polling: 200, timeout: 20_000 },
    );
    // Hydration warnings arrive shortly after mount, not at load.
    await page.waitForTimeout(1500);

    await expect(page.locator("h1"), "exactly one <h1>").toHaveCount(1);
    if (FIXTURE_TEXT[route]) await expect(page.getByText(FIXTURE_TEXT[route])).toBeVisible();
    // The trackers count the fixture guest list, so they never show their "no access" fallback.
    if (route.startsWith("/trackers/")) await expect(page.getByText(/check the Luma access settings/i)).toHaveCount(0);

    await frame(page, route);

    // getAttribute rather than .href: links inside an SVG have an object there.
    const hrefs = await page.$$eval("a[href]", (links) =>
      links.map((a) => new URL(a.getAttribute("href")!, location.href).href),
    );
    const sameSite = [...new Set(hrefs.filter((href) => href.startsWith(BASE)).map((href) => href.split("#")[0]))];
    const broken: string[] = [];
    for (const href of sameSite) {
      if (!checkedLinks.has(href)) {
        const res = await request.get(href, { maxRedirects: 5 });
        checkedLinks.set(href, res.status());
      }
      if (checkedLinks.get(href)! >= 400) broken.push(`${href} → ${checkedLinks.get(href)}`);
    }
    expect(broken, "broken same-site links").toEqual([]);

    expect(problems, "console problems").toEqual([]);
  });
}
