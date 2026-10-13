import { test, type Page } from "@playwright/test";
import { isStaffRoute } from "../../app/sitemap";
import { ROUTES } from "../routes";
import { compareWithLive } from "./compare";

// Every public page (tests/routes.ts, without /staff), local against live:
// static routes from the filesystem, plus one example per dynamic route — the
// same template for every post or person, so one instance is enough to catch
// template regressions.
//
// Not the staff interface: it needs a login, and shows data that differs
// between hosts. tests/behaviour/staff.spec.ts screenshots it instead.
const PUBLIC_ROUTES = ROUTES.filter((route) => !isStaffRoute(route));

// Footer's "© <year>" changes automatically on Jan 1 regardless of any code
// change — always masked so that alone never fails a comparison.
function maskLocators(page: Page, route: string) {
  const masks = [page.locator("#year")];
  if (route === "/") {
    // Hero photo order is randomly shuffled per server render, and the
    // upcoming-events list comes from a live external API (Luma) — neither
    // is stable across two independent page loads, let alone across hosts.
    masks.push(page.locator(".hero-marquee"), page.locator("#events"));
  }
  return masks;
}

for (const route of PUBLIC_ROUTES) {
  test(`visual diff: ${route}`, async ({ page }, testInfo) => {
    await compareWithLive(page, testInfo, route, {
      prepare: async (page, base) => {
        await page.goto(new URL(route, base).toString());
        // "networkidle" never fires on pages with an embedded iframe
        // (/campaigns/'s MP-email form) or ongoing lazy image loads (the hero
        // marquee) — "load" plus a fixed settle covers the marquee's own
        // documented 2.4s CSS safety-net fade-in (see HeroMarqueeEffects.tsx).
        await page.waitForLoadState("load");
        await page.waitForTimeout(2600);
      },
      masks: (page) => maskLocators(page, route),
    });
  });
}
