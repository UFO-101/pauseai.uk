import { homeEventsCopy as copy } from "@/lib/content/home-events";
import { BASE, expect, frame, story, test } from "./fixtures";
import { hydrated } from "./settle";
import type { Page } from "@playwright/test";

// The home page's events (app/(site)/_components/HomeEvents.tsx): choosing
// where to see in-person events near, by postcode, the device's location or
// a local group, or only the online ones, and a link to a local group's or
// the online ones (lib/events-url.ts). On the fixture calendar: in person
// in London, Manchester, Oxford, Bristol and Leicester, Scotland's with no
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

test("Events near a postcode", { tag: "@phone" }, async ({ page }) => {
  story("The home page lists every upcoming event.");
  await openHome(page);
  await frame(page, "Every upcoming event", { of: events(page) });
  story("Someone presses Choose location to see only the events near them.");

  await chooseButton(page).click();
  await expect(page.getByRole("group", { name: copy.pickerLabel })).toBeVisible();
  await frame(page, "Choosing a location", { of: events(page) });
  story(
    "They give a postcode in Westminster. Only the events near there show, and the postcode stays out of the address bar.",
  );

  // Uses /api/events/place.
  await page.getByLabel(copy.postcodeLabel).fill("SW1A 1AA");
  await page.getByRole("button", { name: copy.postcodeButton }).click();
  await expect(nearButton(page, copy.nearShort("Westminster"))).toHaveAttribute("aria-pressed", "true");
  await expect(events(page).getByText("PauseAI London: Protest at Parliament")).toBeVisible();
  await expect(events(page).getByText("PauseAI Manchester Social")).toHaveCount(0);
  // Where someone is stays out of the address bar.
  await expect(page).toHaveURL(`${BASE}/`);
  await frame(page, "The events near Westminster", { of: events(page) });
});

test("The online events", async ({ page }) => {
  story("Someone presses Online. Only the online events show, and the address bar holds a link to them.");
  await openHome(page);
  await page.getByRole("button", { name: copy.online, exact: true }).click();
  await expect(page.getByRole("button", { name: copy.online, exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(events(page).getByText("Introduction to PauseAI UK (online)")).toBeVisible();
  await expect(events(page).getByText("PauseAI Manchester Social")).toHaveCount(0);
  await expect(page).toHaveURL(`${BASE}/?events=online#events`);
  await frame(page, "The online events", { of: events(page) });
});

test("A postcode that isn't found", async ({ page }) => {
  story("Someone gives a postcode that doesn't exist, and is told it wasn't found.");
  await openHome(page);
  await chooseButton(page).click();
  await page.getByLabel(copy.postcodeLabel).fill("ZZ1 1ZZ");
  await page.getByRole("button", { name: copy.postcodeButton }).click();
  await expect(events(page).getByRole("alert")).toHaveText(copy.postcodeNotFound);
  await frame(page, "Postcode not found", { of: events(page) });
});

test("Events near you", async ({ page, context }) => {
  story("Someone in Manchester chooses Use my location. Only the events near Manchester show.");
  // Manchester's centre.
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 53.4808, longitude: -2.2426 });
  await openHome(page);
  await chooseButton(page).click();
  await page.getByRole("button", { name: copy.useLocation }).click();
  await expect(nearButton(page, copy.nearYouShort)).toHaveAttribute("aria-pressed", "true");
  await expect(events(page).getByText("PauseAI Manchester Social")).toBeVisible();
  await expect(events(page).getByText("PauseAI London: Protest at Parliament")).toHaveCount(0);
  await frame(page, "The events near you", { of: events(page) });
  story(
    "Someone in Penzance, far from any event, does the same. They're told there's nothing near there, and pointed to the online events.",
  );

  // Penzance, far from any event on the calendar.
  await context.setGeolocation({ latitude: 50.1186, longitude: -5.5372 });
  await nearButton(page, copy.nearYouShort).click();
  await page.getByRole("button", { name: copy.useLocation }).click();
  await expect(events(page).getByText(copy.noneNear)).toBeVisible();
  await frame(page, "Nothing near you", { of: events(page) });
});

test("A local group's events", async ({ page }) => {
  story("Someone picks Oxford. Its events show, and the address bar holds a link to them.");
  await openHome(page);
  await chooseButton(page).click();
  await page.getByRole("radio", { name: "Oxford" }).click();
  await expect(nearButton(page, copy.nearShort("Oxford"))).toHaveAttribute("aria-pressed", "true");
  await expect(events(page).getByText("AI risk talk")).toBeVisible();
  await expect(page).toHaveURL(`${BASE}/?events=oxford#events`);
  await frame(page, "Oxford's events", { of: events(page) });
  story("Scotland's meeting has no venue yet, but picking Scotland shows it all the same.");

  // Scotland's meeting has no venue yet, so it's Scotland's by its name.
  await nearButton(page, copy.nearShort("Oxford")).click();
  await page.getByRole("radio", { name: "Scotland" }).click();
  await expect(events(page).getByText("PauseAI Scotland Meeting")).toBeVisible();
  await frame(page, "Scotland's meeting", { of: events(page) });
});

test("Links to events", async ({ page }) => {
  story("Someone follows a link to Oxford's events. The home page opens at its events, with Oxford chosen.");
  await page.goto(`${BASE}/?events=oxford#events`);
  await hydrated(page);
  await expect(nearButton(page, copy.nearShort("Oxford"))).toHaveAttribute("aria-pressed", "true");
  await expect(events(page).getByText("AI risk talk")).toBeVisible();
  await expect(events(page).getByText("PauseAI London: Protest at Parliament")).toHaveCount(0);
  await frame(page, "From a link to Oxford's events");
  story("A link to the online events opens with Online chosen.");

  await page.goto(`${BASE}/?events=online#events`);
  await hydrated(page);
  await expect(page.getByRole("button", { name: copy.online, exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(events(page).getByText("Introduction to PauseAI UK (online)")).toBeVisible();
  await frame(page, "From a link to the online events", { of: events(page) });
  story("A link naming a place we don't know shows every event.");

  // A link asking for nothing known shows everything.
  await openHome(page, "/?events=atlantis");
  await frame(page, "From a link to an unknown place", { of: events(page) });
});
