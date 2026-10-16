// The storyboard's test object: every flow gets its own database, a fixed
// clock, and the cookie that tells the build which database it's on. Specs
// import `test` and `expect` from here, never from @playwright/test.
import { test as base, type BrowserContextOptions } from "@playwright/test";
import { copyDatabase, dropDatabase, runSql } from "@/scripts/fresh-database.mjs";
import {
  FIXTURE_NOW,
  FLOW_DATABASE_COOKIE,
  FLOW_DATABASE_PREFIX,
  LOCAL_URL,
  TEMPLATE_DATABASE,
} from "../fixture-env.mjs";

export { expect } from "@playwright/test";
export { frame } from "./frame";

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

export const test = base.extend<{ flowDatabase: string }>({
  // A copy of the template (global-setup.ts), made in tens of milliseconds,
  // for this flow alone, and dropped after it. Named after the test, so a
  // flow run twice, or alongside others, never shares one.
  flowDatabase: [
    async ({}, provide, testInfo) => {
      const name = `${FLOW_DATABASE_PREFIX}${testInfo.testId}_${testInfo.repeatEachIndex}_${testInfo.retry}`.replace(
        /\W/g,
        "_",
      );
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
  // The page's clock agrees with the server's (FIXTURE_NOW), so dates match
  // between runs and nothing needs masking.
  page: async ({ page }, provide) => {
    await page.clock.setFixedTime(new Date(FIXTURE_NOW));
    await provide(page);
  },
});
