import type { Page } from "@playwright/test";
import { constituencyMapCopy as copy } from "@/lib/content/constituency-map";
import { copy as lookupCopy } from "@/lib/content/email-your-mp";
import { WESTMINSTER, seedConstituencyMap } from "./constituency-map-data";
import { BASE, expect, frame, test } from "./fixtures";
import { hydrated, scrollSettled } from "./settle";

// The constituency map (/campaigns/constituencies): switching between
// supporters and each campaign's letters, picking a constituency, and
// finding one's own by postcode. On made-up counts across the map
// (constituency-map-data.ts), each flow on its own database.

const card = (page: Page) => page.getByRole("article");

async function openMap(page: Page, database: string) {
  seedConstituencyMap(database);
  await page.goto(`${BASE}${copy.path}`);
  await hydrated(page);
}

test("Switch the map between supporters and letters", { tag: "@phone" }, async ({ page, flowDatabase }) => {
  await openMap(page, flowDatabase);
  await expect(page.getByRole("radio", { name: copy.layers.supporters })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText(/in \d+ of 650 constituencies/)).toBeVisible();
  await frame(page, "supporters in each constituency, the empty ones hollow");

  await page.getByRole("radio", { name: copy.layers.frontier }).click();
  await expect(page.getByText(/about regulating AI developers, to \d+ of 650 MPs/)).toBeVisible();
  await frame(page, "letters about regulating AI developers, to about a third of MPs");

  await page.getByRole("radio", { name: copy.layers.sobel }).click();
  await expect(page.getByText(/about the Superintelligence Bill, to \d+ of 650 MPs/)).toBeVisible();
  await frame(page, "letters about the bill, to fewer");

  await page.getByText(copy.table.summary).click();
  await expect(page.getByRole("row", { name: new RegExp(`^${WESTMINSTER}`) })).toContainText("42");
  // Six hundred and fifty rows: too long to picture whole.
  await frame(page, "every constituency's numbers as a table", { window: true });
});

test(
  "Pick a constituency on the map, then find yours by postcode",
  { tag: "@phone" },
  async ({ page, flowDatabase }) => {
    await openMap(page, flowDatabase);
    await expect(page.getByText(copy.card.prompt)).toBeVisible();

    await page.locator('[data-code="S14000078"]').click();
    await expect(card(page).getByRole("heading")).toHaveText("Edinburgh East and Musselburgh");
    await scrollSettled(page);
    await frame(page, "a constituency picked: its MP, its numbers and the letters to write");

    await page.getByLabel(copy.finder.label).fill("ZZ99ZZ");
    await page.getByRole("button", { name: copy.finder.button }).click();
    await expect(page.getByText(copy.finder.notOnMap)).toBeVisible();
    await frame(page, "a test MP's postcode: found, but not on the map");

    await page.getByLabel(copy.finder.label).fill("ZZ1 1ZZ");
    await page.getByRole("button", { name: copy.finder.button }).click();
    await expect(page.getByText(lookupCopy.lookup.notFound)).toBeVisible();
    await frame(page, "a postcode that isn't found");

    // Uses /api/email-your-mp/lookup.
    await page.getByLabel(copy.finder.label).fill("SW1A 1AA");
    await page.getByRole("button", { name: copy.finder.button }).click();
    await expect(card(page).getByRole("heading")).toHaveText(WESTMINSTER);
    await expect(card(page).getByText(copy.card.yours)).toBeVisible();
    await expect(card(page)).toContainText(copy.card.supporters(42));
    await scrollSettled(page);
    await frame(page, "their own constituency, found by postcode");

    await card(page).getByRole("button", { name: copy.card.close }).click();
    await expect(page.getByText(copy.card.prompt)).toBeVisible();
    await frame(page, "cleared");
  },
);
