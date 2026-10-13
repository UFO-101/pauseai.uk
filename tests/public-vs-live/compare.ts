import type { Page, TestInfo } from "@playwright/test";
import { compareHosts, type Comparison } from "../compare-hosts";

// This build (LOCAL_URL) against the site as deployed (LIVE_URL), failing on
// a difference. Both are overridable, to compare a preview deploy, say.
export const LIVE_URL = process.env.LIVE_URL ?? "https://pauseai.uk";
export const LOCAL_URL = process.env.LOCAL_URL ?? "http://localhost:3000";

/** Compares the page in one state, local against live, and attaches all three images. */
export function compareWithLive(page: Page, testInfo: TestInfo, label: string, comparison: Comparison) {
  return compareHosts(page, testInfo, label, comparison, {
    subject: { name: "local", url: LOCAL_URL },
    reference: { name: "live", url: LIVE_URL },
    failOnDiff: true,
  });
}
