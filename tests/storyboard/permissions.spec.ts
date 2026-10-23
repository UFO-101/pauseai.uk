import type { APIRequestContext, Page } from "@playwright/test";
import { staffCopy } from "@/lib/content/staff-interface";
import { IMPORT_JOBS, importPath } from "@/lib/import-runs";
import { TEST_MPS } from "@/lib/test-mps";
import { runSql } from "@/scripts/fresh-database.mjs";
import { ROUTES } from "../routes";
import {
  addStaffAccount,
  fakeTurnstile,
  fillLetter,
  importLuma,
  importMembers,
  logInAsStaff,
  lookUpTestMp,
  sendLetter,
  syncMps,
  WEBHOOK_AUTH,
} from "../steps";
import { BASE, expect, frame, test } from "./fixtures";

// What staff see by permission: supporter data only with `supporters`,
// wherever it would show. Each flow on its own database.

const staffEmail = () => `staff-${test.info().testId.replace(/\W/g, "").slice(-8)}@pauseai.uk`;
const testy = TEST_MPS[0];

/** Gives this flow's staff member an account with `permissions`, then logs them in. */
async function logIn(page: Page, database: string, permissions: string[] = []) {
  addStaffAccount(database, staffEmail(), permissions);
  await logInAsStaff(page, BASE, staffEmail());
}

/** A letter to the test MP from `sender`, sent through the campaign page. */
async function writeLetter(page: Page, sender: string) {
  await fakeTurnstile(page);
  await lookUpTestMp(page, BASE, testy);
  await fillLetter(page, sender);
  await sendLetter(page, testy);
}

/** Postmark's bounce webhook for an email to `address` that we can't place, as a forwarded reply's might be. */
async function postBounce(request: APIRequestContext, address: string) {
  const bounce = await request.post(`${BASE}/api/postmark/bounce`, {
    headers: { Authorization: WEBHOOK_AUTH },
    data: {
      RecordType: "Bounce",
      Type: "HardBounce",
      TypeCode: 1,
      Name: "Hard bounce",
      Description: "The server was unable to deliver your message (ex: unknown user, mailbox not found).",
      Email: address,
      BouncedAt: "2026-10-16T12:00:00Z",
      Inactive: true,
      CanActivate: true,
    },
  });
  expect(await bounce.json()).toEqual({ recorded: true });
}

/** The ID of the politician named `name` in the flow's database. */
const politicianId = (database: string, name: string) =>
  runSql(database, `SELECT id FROM politicians WHERE name = '${name}'`)[0];

test("with no permissions, no page shows a supporter's name or email, nor sends one in its RSC payload", async ({
  page,
  request,
  flowDatabase,
}, testInfo) => {
  await syncMps(request, BASE);
  await importLuma(request, BASE);
  await importMembers(request, BASE);
  const sender = `jane+${testInfo.testId}@example.com`;
  await writeLetter(page, sender);
  await postBounce(request, sender);
  // Everyone the flow's database knows of, by name and by every address.
  const secrets = runSql(
    flowDatabase,
    "SELECT name FROM supporter_identity WHERE name <> '' UNION SELECT email FROM supporter_identity",
  );
  expect(secrets).toContain(sender);
  expect(secrets).toContain("Jane Fixture");

  await logIn(page, flowDatabase);
  await frame(page, "the staff home with no permissions: no Supporters section");
  const testyId = politicianId(flowDatabase, testy.name);
  const letterId = runSql(flowDatabase, "SELECT id FROM letters")[0];
  const supporterId = runSql(flowDatabase, "SELECT id FROM supporters ORDER BY id")[0];
  const routes = [
    ...ROUTES.filter((route) => route.startsWith("/staff") && !route.startsWith("/staff/login")),
    ...IMPORT_JOBS.map(importPath),
    `/staff/politicians/${testyId}`,
    `/staff/letters/${letterId}`,
    `/staff/letters/supporter/${supporterId}`,
    `/staff/supporters/${supporterId}`,
    `/staff/supporters/${supporterId}/erase`,
  ];
  for (const route of routes) {
    // The page as HTML, and as the RSC payload a client-side navigation fetches.
    for (const headers of [{}, { RSC: "1" }] as Record<string, string>[]) {
      const res = await page.request.get(`${BASE}${route}`, { headers });
      expect(res.status(), route).toBe(200);
      const body = await res.text();
      for (const secret of secrets) expect(body, `${route} ${JSON.stringify(headers)}`).not.toContain(secret);
    }
  }

  await page.goto(`${BASE}/staff/politicians/${testyId}`);
  await expect(page.getByText(staffCopy.politician.history.unsignedLetter, { exact: false })).toBeVisible();
  await frame(page, "an MP's page with no permissions: the letter, without who wrote it");
});

test("without supporters, Letters and Blocked supporter emails are closed, and Blocked MP emails names letters without linking them", async ({
  page,
  request,
  flowDatabase,
}, testInfo) => {
  await syncMps(request, BASE);
  const bouncy = TEST_MPS.find((mp) => mp.postcode === "ZZ99ZH")!;
  await fakeTurnstile(page);
  await lookUpTestMp(page, BASE, bouncy);
  await fillLetter(page, `jane+${testInfo.testId}@example.com`);
  await sendLetter(page, bouncy);
  const messageId = runSql(flowDatabase, "SELECT message_id FROM email_sends WHERE purpose = 'letter'")[0];
  const bounce = await request.post(`${BASE}/api/postmark/bounce`, {
    headers: { Authorization: WEBHOOK_AUTH },
    data: {
      RecordType: "Bounce",
      MessageID: messageId,
      Type: "HardBounce",
      TypeCode: 1,
      Name: "Hard bounce",
      Description: "The server was unable to deliver your message (ex: unknown user, mailbox not found).",
      Email: "no-such-mailbox@pauseai.uk",
      BouncedAt: "2026-10-16T12:00:00Z",
      Inactive: true,
      CanActivate: true,
    },
  });
  expect(await bounce.json()).toEqual({ recorded: true });

  await logIn(page, flowDatabase);
  for (const closed of ["/staff/letters", "/staff/supporters/blocked-emails"]) {
    await page.goto(`${BASE}${closed}`);
    await expect(page).toHaveURL(`${BASE}/staff`);
  }
  await page.goto(`${BASE}/staff/politicians/blocked-emails`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.emails.titles.mps);
  const blocked = page.getByRole("table").first().getByRole("row").filter({ hasText: "no-such-mailbox@pauseai.uk" });
  await expect(blocked.getByText(`${staffCopy.emails.letterTo} ${bouncy.name}`)).toBeVisible();
  await expect(page.locator('a[href^="/staff/letters"]')).toHaveCount(0);
  await frame(page, "Blocked MP emails without supporters: the letter named, not linked");

  // With supporters, the same page links to the letter.
  addStaffAccount(flowDatabase, staffEmail(), ["supporters"]);
  await page.reload();
  await blocked.getByRole("link", { name: `${staffCopy.emails.letterTo} ${bouncy.name}` }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.letters.oneTitle(bouncy.name));
  await frame(page, "with supporters, the letter it names opens");
});

test("a supporter's bounced address is on Blocked supporter emails, not Blocked MP emails, and staff with supporters unblock it", async ({
  page,
  request,
  flowDatabase,
}) => {
  await syncMps(request, BASE);
  await importLuma(request, BASE);
  await postBounce(request, "jane.fixture@example.com");
  await logIn(page, flowDatabase, ["supporters"]);

  await page.goto(`${BASE}/staff/politicians/blocked-emails`);
  await expect(page.getByText(staffCopy.emails.noBlocks)).toBeVisible();
  await frame(page, "Blocked MP emails: nothing, as no MP's address bounced");

  await page.goto(`${BASE}/staff/supporters/blocked-emails`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffCopy.emails.titles.supporters);
  const row = page.getByRole("table").first().getByRole("row").filter({ hasText: "jane.fixture@example.com" });
  await expect(row).toContainText(staffCopy.emails.kinds.hard);
  await frame(page, "Blocked supporter emails: Jane's address, bounced");

  await row.getByLabel(staffCopy.emails.note).fill("She gave us a new one");
  await row.getByRole("button", { name: staffCopy.emails.unblock }).click();
  await expect(page.getByText(staffCopy.emails.noBlocks)).toBeVisible();
  await frame(page, "unblocked");
});
