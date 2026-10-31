// The storyboard's test object: every flow gets its own database, a fixed
// clock, and the cookie that tells the build which database it's on. Specs
// import `test` and `expect` from here, never from @playwright/test.
import { createHash } from "node:crypto";
import { test as base, type BrowserContextOptions } from "@playwright/test";
import { copyDatabase, dropDatabase, runSql } from "@/scripts/fresh-database.mjs";
import { FLOW_DATABASES, TEMPLATE_DATABASE } from "../checkout.mjs";
import { FIXTURE_NOW, FLOW_DATABASE_COOKIE, LOCAL_URL } from "../fixture-env.mjs";

export { expect } from "@playwright/test";
export { emailFrame, frame } from "./frame";

/** The build under test. */
export const BASE = LOCAL_URL;

/** The storage state (just the database cookie) a context needs to be on `database`. */
export function flowStorageState(database: string): Exclude<BrowserContextOptions["storageState"], string | undefined> {
  return {
    cookies: [
      {
        name: FLOW_DATABASE_COOKIE,
        value: database,
        domain: new URL(BASE).hostname,
        path: "/",
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
    ],
    origins: [],
  };
}

/** Google Analytics and Tag Manager, which the fixture build loads (ANALYTICS=1, ../fixture-env.mjs). */
export const ANALYTICS_URL = "**/www.googletagmanager.com/**";

/** Stands in for pauseai.info's onboarding form, posting its height as the real embed does. */
const ONBOARDING_FORM_STAND_IN = `<!doctype html>
<html lang="en"><body style="margin:0;background:#FDF8F3;font:16px system-ui,sans-serif">
<div style="height:600px;display:flex;align-items:center;justify-content:center;border:2px dashed #ccc;box-sizing:border-box">
  stand-in for the onboarding form on pauseai.info
</div>
<script>parent.postMessage({ height: 600 }, "*");</script>
</body></html>`;

/**
 * Stands in for Tally's embed script (the story form on /people): it loads
 * no form, so the form's space is the same, and empty, every run. The real
 * one's arrival varied with the network.
 */
const TALLY_STAND_IN = "window.Tally = { loadEmbeds: () => {} };";

export const test = base.extend<{ flowDatabase: string }>({
  // A copy of the template (global-setup.ts), made in tens of milliseconds,
  // for this flow alone, and dropped after it. Named after the test, so a
  // flow run twice, or alongside others, never shares one: a hash, as the
  // test's id and the checkout's are more than Postgres's 63 characters.
  flowDatabase: [
    async ({}, provide, testInfo) => {
      const flow = `${testInfo.testId} ${testInfo.repeatEachIndex} ${testInfo.retry}`;
      const name = `${FLOW_DATABASES}${createHash("sha256").update(flow).digest("hex").slice(0, 24)}`;
      copyDatabase(name, TEMPLATE_DATABASE);
      // The fixed clock's now() first, before Postgres's own (global-setup.ts).
      runSql("postgres", `ALTER DATABASE "${name}" SET search_path = fixture, pg_catalog, public`);
      await provide(name);
      dropDatabase(name);
    },
    { auto: true },
  ],
  // Every page and request in the flow carries the cookie naming its database.
  storageState: async ({ flowDatabase }, provide) => provide(flowStorageState(flowDatabase)),
  // No flow ever reaches Google: a test run is not a visit. consent.spec.ts
  // routes the same URLs on its page, which takes precedence, to record what
  // the page tried to load.
  context: async ({ context }, provide) => {
    await context.route(ANALYTICS_URL, (route) => route.abort());
    await provide(context);
  },
  // The page's clock agrees with the server's (FIXTURE_NOW), so dates match
  // between runs and nothing needs masking. The onboarding form, the one
  // outside page a fixture build still embeds, is a stand-in that reports a
  // fixed height: the real one's height, and so the page below it, varied
  // between runs. Tally's story form doesn't load at all.
  page: async ({ page }, provide) => {
    await page.clock.setFixedTime(new Date(FIXTURE_NOW));
    await page.route("https://pauseai.info/**", (route) =>
      route.fulfill({ contentType: "text/html", body: ONBOARDING_FORM_STAND_IN }),
    );
    await page.route("https://tally.so/**", (route) =>
      route.fulfill({ contentType: "text/javascript", body: TALLY_STAND_IN }),
    );
    await provide(page);
  },
});

/**
 * A made-up address for `name`, as a real one looks:
 * jane.smith11@example.com. Flows run side by side and find their emails
 * in one outbox by address, so each address a flow makes up has its own
 * `number`, 1 to 49, that no other uses; on the phone it's 50 more, as both
 * viewports run at once.
 */
export function madeUpAddress(name: string, number: number, domain = "example.com"): string {
  const local = name.toLowerCase().replace(/\s+/g, ".");
  return `${local}${number + (test.info().project.name === "phone" ? 50 : 0)}@${domain}`;
}
