import { test } from "@playwright/test";
import { isStaffRoute } from "../../app/sitemap";
import { ROUTES } from "../routes";
import { compareWithMain } from "./compare";

// Every public page, this branch against main, both on fixture data, so a
// difference is a change in this branch rather than in the news or events.
// Never fails on a difference; a page main doesn't have is noted. Staff
// pages are in flows.spec.ts, after logging in.
const PUBLIC_ROUTES = ROUTES.filter((route) => !isStaffRoute(route));

for (const route of PUBLIC_ROUTES) {
  test(`branch vs main: ${route}`, async ({ page }, testInfo) => {
    await compareWithMain(page, testInfo, route, {
      prepare: async (page, base) => {
        const response = await page.goto(new URL(route, base).toString());
        if (!response?.ok()) throw new Error(`${route} returned ${response?.status()}`);
        await page.waitForLoadState("load");
        // The hero marquee's documented 2.4s safety-net fade-in.
        await page.waitForTimeout(2600);
      },
      // The year, and the home page's hero photos, which are shuffled on
      // every render.
      masks: (page) => [page.locator("#year"), page.locator(".hero-marquee")],
    });
  });
}
