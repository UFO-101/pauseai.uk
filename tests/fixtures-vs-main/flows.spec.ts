import { expect, test, type Page } from "@playwright/test";
import { staffCopy } from "@/lib/content/staff-interface";
import { fakeTurnstile, fillLetter, logInAsStaff, lookUpTestMp, sendLetter, syncMps } from "../steps";
import { BRANCH_URL, compareWithMain, MAIN_URL, outboxFor } from "./compare";

// Each step of the flows that need fixtures, this branch against main:
// Email your MP up to the letter being sent, and each staff screen after
// logging in through the fixture Google. Never fails on a difference. The
// steps' own checks fail the test on this branch; on main, a step it can't
// take yet (a page this branch adds) is noted instead.

test.beforeAll(async ({ request }) => {
  await syncMps(request, BRANCH_URL);
  // Main may not have the sync yet; then it has no MPs, and its steps are noted.
  await syncMps(request, MAIN_URL).catch(() => {});
});

test.beforeEach(async ({ page }) => fakeTurnstile(page));

// The footer year, and anything showing a date and time, which differ by run.
const DATE_TIME = /\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}(:\d{2})?/;
const masks = (page: Page) => [page.locator("#year"), page.getByText(DATE_TIME)];

// The same sender on both builds, new each run. (Letters to the test MP
// aren't limited to one per campaign, but main's may be.)
const sender = (step: string) => `jane+${step}-${Date.now().toString(36)}@example.com`;

test("branch vs main: ZZ99ZZ finds the test MP and drafts the letter", async ({ page }, testInfo) => {
  await compareWithMain(page, testInfo, "letter drafted", { prepare: (page, base) => lookUpTestMp(page, base), masks });
});

test("branch vs main: the letter filled in, asking to confirm", async ({ page }, testInfo) => {
  await compareWithMain(page, testInfo, "asking to confirm", {
    prepare: async (page, base) => {
      await lookUpTestMp(page, base);
      await fillLetter(page, "jane@example.com");
    },
    masks,
  });
});

test("branch vs main: the letter sent", async ({ page }, testInfo) => {
  const email = sender("sent");
  await compareWithMain(page, testInfo, "letter sent", {
    prepare: async (page, base) => {
      await lookUpTestMp(page, base);
      await fillLetter(page, email);
      await sendLetter(page);
    },
    masks,
  });
});

test("branch vs main: the staff login page", async ({ page }, testInfo) => {
  await compareWithMain(page, testInfo, "/staff/login", {
    prepare: async (page, base) => {
      const response = await page.goto(`${base}/staff/login`);
      if (!response?.ok()) throw new Error(`/staff/login returned ${response?.status()}`);
    },
    masks,
  });
});

// Each screen logs in as its own address, new each run, so the cap of five
// login emails an hour to one address never stops a step.
const RUN = Date.now().toString(36);

/** Logs in on `base`, opens `path`, and waits for its heading. */
async function staffScreen(page: Page, base: string, path: string) {
  await logInAsStaff(page, base, outboxFor(base), `staff+${RUN}${path.replace(/\W+/g, "-")}@pauseai.uk`);
  await expect(page).toHaveURL(`${base}/staff`);
  if (path !== "/staff") await page.goto(`${base}${path}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

for (const [path, name] of [
  ["/staff", "politicians"],
  ["/staff/politicians/new", "add a signer"],
  ["/staff/mp-sync", "MP syncs"],
  ["/staff/mp-check", "MP check"],
  ["/staff/import", "import"],
] as const) {
  test(`branch vs main: staff, ${name}`, async ({ page }, testInfo) => {
    await compareWithMain(page, testInfo, path, { prepare: (page, base) => staffScreen(page, base, path), masks });
  });
}

// What other tests have sent or changed differs between the two builds, so
// these tables' rows are masked: only the page around them is compared.
for (const [path, name] of [
  ["/staff/letters", "letters"],
  ["/staff/changes", "changes"],
] as const) {
  test(`branch vs main: staff, ${name}`, async ({ page }, testInfo) => {
    await compareWithMain(page, testInfo, path, {
      prepare: (page, base) => staffScreen(page, base, path),
      masks: (page) => [...masks(page), page.locator("tbody")],
    });
  });
}

test("branch vs main: staff, the test MP's page", async ({ page }, testInfo) => {
  await compareWithMain(page, testInfo, "the test MP's page", {
    prepare: async (page, base) => {
      await staffScreen(page, base, "/staff");
      await page.getByRole("link", { name: "Testy McTestface MP" }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Testy McTestface MP");
      await expect(page.getByRole("heading", { name: staffCopy.politician.statusesTitle })).toBeVisible();
    },
    masks,
  });
});
