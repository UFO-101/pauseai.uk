import { homeEventsCopy as copy } from "@/lib/content/home-events";
import { BASE, expect, frame, test } from "./fixtures";
import { hydrated } from "./settle";
import type { Page } from "@playwright/test";

// The home page's events (app/(site)/_components/HomeEvents.tsx): choosing
// where to see in-person events near, by postcode, the device's location or
// a local group, or only the online ones, and a link to a local group's or
// the online ones (lib/events-url.ts). On the fixture calendar: in person
// in London, Manchester, Oxford, Bristol and Leicester, Glasgow's with no
// venue yet, and one online.

const events = (page: Page) => page.locator("#events");
const nearButton = (page: Page, name: string = copy.chooseWhere) =>
  events(page).getByRole("button", { name, exact: true });
const chooseButton = (page: Page) => nearButton(page);

async function openHome(page: Page, query = "") {
  await page.goto(`${BASE}${query}`);
  await hydrated(page);
  await expect(events(page).getByRole("button", { name: copy.all, exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
}

test("events near a postcode", { tag: "@phone" }, async ({ page }) => {
  await openHome(page);
  await frame(page, "every upcoming event", { of: events(page) });

  await chooseButton(page).click();
  await expect(page.getByRole("group", { name: copy.pickerLabel })).toBeVisible();
  await frame(page, "the choice of where, open", { of: events(page) });

  // Uses /api/events/place.
  await page.getByLabel(copy.postcodeLabel).fill("SW1A 1AA");
  await page.getByRole("button", { name: copy.postcodeButton }).click();
  await expect(nearButton(page, copy.nearShort("Westminster"))).toHaveAttribute("aria-pressed", "true");
  await expect(events(page).getByText("PauseAI London: Protest at Parliament")).toBeVisible();
  await expect(events(page).getByText("PauseAI Manchester Social")).toHaveCount(0);
  // Where someone is stays out of the address bar.
  await expect(page).toHaveURL(`${BASE}/`);
  await frame(page, "only the events near Westminster", { of: events(page) });
});

test("only the online events", async ({ page }) => {
  await openHome(page);
  await page.getByRole("button", { name: copy.online, exact: true }).click();
  await expect(page.getByRole("button", { name: copy.online, exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(events(page).getByText("Introduction to PauseAI UK (online)")).toBeVisible();
  await expect(events(page).getByText("PauseAI Manchester Social")).toHaveCount(0);
  await expect(page).toHaveURL(`${BASE}/?events=online#events`);
  await frame(page, "only the online events", { of: events(page) });
});

test("a postcode that isn't found", async ({ page }) => {
  await openHome(page);
  await chooseButton(page).click();
  await page.getByLabel(copy.postcodeLabel).fill("ZZ1 1ZZ");
  await page.getByRole("button", { name: copy.postcodeButton }).click();
  await expect(events(page).getByRole("alert")).toHaveText(copy.postcodeNotFound);
  await frame(page, "the postcode not found", { of: events(page) });
});

test("events near the device's location", async ({ page, context }) => {
  // Manchester's centre.
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 53.4808, longitude: -2.2426 });
  await openHome(page);
  await chooseButton(page).click();
  await page.getByRole("button", { name: copy.useLocation }).click();
  await expect(nearButton(page, copy.nearYouShort)).toHaveAttribute("aria-pressed", "true");
  await expect(events(page).getByText("PauseAI Manchester Social")).toBeVisible();
  await expect(events(page).getByText("PauseAI London: Protest at Parliament")).toHaveCount(0);
  await frame(page, "only the events near the device's location", { of: events(page) });

  // Penzance, far from any event on the calendar.
  await context.setGeolocation({ latitude: 50.1186, longitude: -5.5372 });
  await nearButton(page, copy.nearYouShort).click();
  await page.getByRole("button", { name: copy.useLocation }).click();
  await expect(events(page).getByText(copy.noneNear)).toBeVisible();
  await frame(page, "nothing on near the device's location", { of: events(page) });
});

test("a local group's events, venue set or not", async ({ page }) => {
  await openHome(page);
  await chooseButton(page).click();
  await page.getByRole("radio", { name: "Oxford" }).click();
  await expect(nearButton(page, copy.nearShort("Oxford"))).toHaveAttribute("aria-pressed", "true");
  await expect(events(page).getByText("AI risk talk")).toBeVisible();
  await expect(page).toHaveURL(`${BASE}/?events=oxford#events`);
  await frame(page, "Oxford's events, with the address bar saying so", { of: events(page) });

  // Glasgow's meeting has no venue yet, so it's Glasgow's by its name.
  await nearButton(page, copy.nearShort("Oxford")).click();
  await page.getByRole("radio", { name: "Glasgow" }).click();
  await expect(events(page).getByText("PauseAI Scotland Meeting")).toBeVisible();
  await frame(page, "Glasgow's meeting, with no venue yet", { of: events(page) });
});

test("a link to a local group's events, or the online ones", async ({ page }) => {
  await page.goto(`${BASE}/?events=oxford#events`);
  await hydrated(page);
  await expect(nearButton(page, copy.nearShort("Oxford"))).toHaveAttribute("aria-pressed", "true");
  await expect(events(page).getByText("AI risk talk")).toBeVisible();
  await expect(events(page).getByText("PauseAI London: Protest at Parliament")).toHaveCount(0);
  await frame(page, "opened from a link to Oxford's events");

  await page.goto(`${BASE}/?events=online#events`);
  await hydrated(page);
  await expect(page.getByRole("button", { name: copy.online, exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(events(page).getByText("Introduction to PauseAI UK (online)")).toBeVisible();
  await frame(page, "opened from a link to the online events", { of: events(page) });

  // A link asking for nothing known shows everything.
  await openHome(page, "/?events=atlantis");
  await frame(page, "opened from a link asking for an unknown place", { of: events(page) });
});
