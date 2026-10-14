import type { Page, TestInfo } from "@playwright/test";
import { compareHosts, type Comparison } from "../compare-hosts";
import { MAIN_OUTBOX_DIR, OUTBOX_DIR } from "../fixture-env.mjs";

// This branch's fixture build against main's (scripts/serve-main.mjs), never
// failing on a difference: the report shows each pair and their diff for a
// person to look over. Only the behaviour checks along the way can fail, and
// only on this branch.
export const BRANCH_URL = process.env.LOCAL_URL ?? "http://localhost:3100";
export const MAIN_URL = process.env.MAIN_URL ?? "http://localhost:3001";

/** Each build's outbox, so a step can follow a link it emailed. */
export function outboxFor(base: string): string {
  return base === MAIN_URL ? MAIN_OUTBOX_DIR : OUTBOX_DIR;
}

export function compareWithMain(page: Page, testInfo: TestInfo, label: string, comparison: Comparison) {
  return compareHosts(page, testInfo, label, comparison, {
    subject: { name: "branch", url: BRANCH_URL },
    reference: { name: "main", url: MAIN_URL },
    failOnDiff: false,
  });
}
