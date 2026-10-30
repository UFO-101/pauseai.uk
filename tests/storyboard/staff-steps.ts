import type { APIRequestContext, Page, Route } from "@playwright/test";
import { longDay } from "@/lib/calendar-days";
import { DATE_PICKER_WORDS } from "@/lib/content/date-picker";
import { staffCopy } from "@/lib/content/staff-interface";
import { TEST_MPS } from "@/lib/test-mps";
import { runSql } from "@/scripts/fresh-database.mjs";
import { ROUTES } from "../routes";
import {
  addStaffAccount,
  fakeTurnstile,
  fillLetter,
  logInAsStaff,
  lookUpTestMp,
  sendLetter,
  WEBHOOK_AUTH,
} from "../steps";
import { BASE, expect, test } from "./fixtures";

// What the staff sections' flows share (staff-login, staff-navigation,
// imports, letters): each flow's own staff address and logging it in, and
// the steps the letters' and the lists' flows take.

export const STAFF_PAGES = ROUTES.filter((route) => route.startsWith("/staff") && !route.startsWith("/staff/login"));

/** The letter to the PM's ask, by its title in the asks table. */
export const PM_LETTER = "Frontier AI letter to the Prime Minister";

/** This flow's own staff address: flows run alongside each other, and share the outbox. Short, as real ones are. */
export const staffEmail = () => `staff-${test.info().testId.replace(/\W/g, "").slice(-8)}@pauseai.uk`;

/** Gives this flow's staff member an account, then logs them in with the link emailed to them. */
export async function logIn(page: Page, database: string, permissions: string[] = []) {
  addStaffAccount(database, staffEmail(), permissions);
  return logInAsStaff(page, BASE, staffEmail());
}

/**
 * Holds the next request for the page at a URL matching `target` (a
 * navigation's, not a prefetch: a link hovered fetches its page whole
 * ahead), so a flow can picture the page while it waits; `release` lets it
 * through.
 */
export async function holdNextPage(page: Page, target: RegExp): Promise<{ release: () => Promise<void> }> {
  let open = () => {};
  const held = new Promise<void>((done) => (open = done));
  let holding = true;
  const matches = (url: URL) => url.searchParams.has("_rsc") && target.test(url.search);
  const handler = async (route: Route) => {
    if (!holding || route.request().headers()["next-router-prefetch"]) return route.continue();
    holding = false;
    await held;
    await route.continue();
  };
  await page.route(matches, handler);
  return {
    release: async () => {
      open();
      await page.unroute(matches, handler);
    },
  };
}

/**
 * Keeps the browser on the page when a button there next leaves it for a
 * URL matching `target`: the page cancels that navigation itself (the
 * Navigation API's navigate event), as if the next page were slow to come,
 * so a flow can picture the button waiting. No page load is begun, which
 * Playwright would wait on. `asked` gives the URL it was going to, to go on
 * to with page.goto.
 */
export async function stayOnPage(page: Page, target: RegExp): Promise<{ asked: () => Promise<string> }> {
  await page.evaluate((source) => {
    const pattern = new RegExp(source);
    const stay = (event: Event) => {
      const going = event as Event & { destination: { url: string } };
      if (!pattern.test(going.destination.url)) return;
      event.preventDefault();
      document.documentElement.dataset.stayedFrom = going.destination.url;
      (window as unknown as { navigation: EventTarget }).navigation.removeEventListener("navigate", stay);
    };
    (window as unknown as { navigation: EventTarget }).navigation.addEventListener("navigate", stay);
  }, target.source);
  return { asked: () => page.evaluate(() => document.documentElement.dataset.stayedFrom!) };
}

/** Whether the line along the top of the page, while something loads, is showing (StaffPage). */
export const loadingLine = (page: Page) =>
  page.evaluate(() => {
    const line = getComputedStyle(document.querySelector("main")!, "::before");
    return line.content !== "none" && line.opacity === "1";
  });

/** The shared inbox in a fixture build (tests/fixture-env.mjs), where staff alerts go. */
export const STAFF_INBOX = "replies@example.org";

/** Bouncy McTestface MP, whose address doesn't exist. */
export const bouncy = TEST_MPS.find((mp) => mp.postcode === "ZZ99ZH")!;

export const BOUNCY_ADDRESS = "no-such-mailbox@pauseai.uk";

/** Postmark's bounce webhook, as it posts one for a hard bounce of `messageId`, or of an email we can't place. */
export async function postBounce(request: APIRequestContext, messageId?: string) {
  const bounce = await request.post(`${BASE}/api/postmark/bounce`, {
    headers: { Authorization: WEBHOOK_AUTH },
    data: {
      RecordType: "Bounce",
      MessageID: messageId,
      Type: "HardBounce",
      TypeCode: 1,
      Name: "Hard bounce",
      Description: "The server was unable to deliver your message (ex: unknown user, mailbox not found).",
      Email: BOUNCY_ADDRESS,
      BouncedAt: "2026-10-16T12:00:00Z",
      Inactive: true,
      CanActivate: true,
    },
  });
  expect(await bounce.json()).toEqual({ recorded: true });
}

/** Writes to `mp` as `sender`, signed `name`, then, logged in, sees it sent, and gives its Postmark MessageID. */
export async function sentLetterId(
  page: Page,
  database: string,
  sender: string,
  mp = TEST_MPS[0],
  name = "Jane Smith",
): Promise<string> {
  await fakeTurnstile(page);
  await lookUpTestMp(page, BASE, mp, name);
  await fillLetter(page, sender);
  await sendLetter(page, mp);
  await page.goto(`${BASE}/staff/letters`);
  if (new URL(page.url()).pathname === "/staff/login") await logIn(page, database, ["supporters"]);
  await page.goto(`${BASE}/staff/letters`);
  const row = page.getByRole("row").filter({ hasText: sender });
  await expect(row).toContainText(staffCopy.letters.status.sent);
  const [id] = runSql(
    database,
    "SELECT message_id FROM email_sends WHERE purpose = 'letter' AND outcome = 'sent' ORDER BY id DESC LIMIT 1",
  );
  return id;
}

/**
 * Chooses `day` with the date picker the field `label` names: opens it,
 * moves on a few weeks at a time until the day is in view, and clicks it.
 */
export async function chooseDay(page: Page, label: string, day: string) {
  await page.getByRole("button", { name: label }).click();
  const calendar = page.getByRole("dialog");
  const target = calendar.getByRole("button", { name: new RegExp(`^${longDay(day)}`) });
  while (!(await target.isVisible())) await calendar.getByRole("button", { name: DATE_PICKER_WORDS.later }).click();
  await target.click();
}
