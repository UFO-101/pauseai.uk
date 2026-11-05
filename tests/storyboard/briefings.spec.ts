import { briefings } from "@/lib/content/briefings";
import { BASE, expect, frame, test } from "./fixtures";

// The briefings: posts like the blog's, under the campaigns. The page is
// the first briefing, with its charts and its numbered sources.
const briefing = briefings[0];

test("The menu to briefings", { tag: "@desktop-only" }, async ({ page }) => {
  await page.goto(`${BASE}/`);
  const trigger = page.getByRole("link", { name: "Campaigns", exact: true });
  // Opened by focus, not hover: a frame moves the pointer away first, which
  // would close a hovered menu.
  await trigger.focus();
  const link = trigger.locator("..").getByRole("menuitem", { name: "Weekly briefings" });
  await expect(link).toBeVisible();
  await frame(page, "the Campaigns menu, with the briefings");
  await link.click();
  await expect(page).toHaveURL(`${BASE}/campaigns/briefings`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Weekly briefings");
  await frame(page, "the briefings, from the menu");
});

test("Read a briefing", async ({ page }) => {
  await page.goto(`${BASE}/campaigns/briefings`);
  await page.getByRole("link", { name: new RegExp(briefing.title) }).click();
  await expect(page).toHaveURL(`${BASE}/campaigns/briefings/${briefing.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(briefing.title);
  await frame(page, "a briefing, with the week's calendar");

  const budget = page.getByRole("table");
  await budget.scrollIntoViewIfNeeded();
  await expect(budget.locator("tbody tr")).toHaveCount(13);
  await frame(page, "the budget, by item");

  const signatories = page.getByText("Countries backing the Call");
  await signatories.scrollIntoViewIfNeeded();
  await frame(page, "the countries backing the call");

  const nextWeek = page.getByRole("heading", { name: "Next week key dates" });
  await nextWeek.scrollIntoViewIfNeeded();
  await frame(page, "next week's dates");

  await page.getByRole("link", { name: "Source 14" }).click();
  await expect(page).toHaveURL(/#source-14$/);
  await expect(page.locator("#source-14")).toBeInViewport();
  await frame(page, "a source, from its mark");

  await page.getByRole("link", { name: "← All briefings" }).click();
  await expect(page).toHaveURL(`${BASE}/campaigns/briefings`);
  await frame(page, "back at the briefings");
});
