import type { APIRequestContext, Page, Route } from "@playwright/test";
import { longDay } from "@/lib/calendar-days";
import { DATE_PICKER_WORDS } from "@/lib/content/date-picker";
import { campaigns } from "@/lib/content/email-your-mp";
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
import { bounceOf, deliver, letterIdOf, OFFICE, readInbox, sentIds, testProxy } from "./letters-inbox-steps";

// What the staff sections' flows share (staff-login, staff-navigation,
// imports, letters): each flow's own staff address and logging it in, and
// the steps the letters' and the lists' flows take.

export const STAFF_PAGES = ROUTES.filter((route) => route.startsWith("/staff") && !route.startsWith("/staff/login"));

/** The letter to the PM's ask, by its title in the asks table. */
export const PM_LETTER = "Frontier AI letter to the Prime Minister";

/** This flow's own staff address: flows run alongside each other, and share the outbox. Short, as real ones are. */
export const staffEmail = () => `staff-${test.info().testId.replace(/\W/g, "").slice(-8)}@pauseai.uk`;

/** Gives this flow's staff member an account, then logs them in (logInAsStaff in tests/steps.ts). */
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

/** The policy inbox in a fixture build (tests/fixture-env.mjs), where replies to letters sent before the letters inbox go. */
export const POLICY_INBOX = "policy@example.org";

/** Where a fixture build emails when something needs a person (tests/fixture-env.mjs). */
export { NOTIFICATION_INBOX } from "../fixture-env.mjs";

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

/**
 * The MP's office answers a letter, at its sender's proxy: written, or with
 * `auto`, an acknowledgement marked only by its subject, as Parliament's
 * Outlook sends them; then the hourly read relays it.
 */
export async function postReply(request: APIRequestContext, database: string, letterId: string, auto = false) {
  const [tag] = runSql(
    database,
    `SELECT p.tag FROM letters_from_supporters s JOIN proxies p ON p.id = s.proxy_id WHERE s.id = ${letterId}`,
  );
  deliver(database, {
    from: OFFICE,
    to: testProxy(tag),
    subject: auto ? "Automatic reply: Please back a pause" : "Re: Please back a pause",
    text: auto
      ? "Thank you for contacting me. Please take this reply as confirmation that your email has been received.\r\n"
      : "Dear constituent,\r\n\r\nThank you for writing to me.\r\n",
  });
  await readInbox(request);
}

/** The letter bounces: its MP's mail server refuses it, and the hourly read finds the bounce in the letters inbox. */
export async function bounceLetter(request: APIRequestContext, database: string, letterId: string, address: string) {
  const [messageId] = sentIds(database, letterId, "letter");
  deliver(database, bounceOf(messageId, address));
  await readInbox(request);
}

/** Writes to `mp` as `sender`, signed `name`, then, logged in, sees it sent, and gives the letter's ID. */
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
  await page.goto(`${BASE}/staff/campaigns/${campaigns[0].slug}`);
  if (new URL(page.url()).pathname === "/staff/login") await logIn(page, database, ["supporters"]);
  await page.goto(`${BASE}/staff/campaigns/${campaigns[0].slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  return letterIdOf(database, sender);
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
