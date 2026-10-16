import { BASE, expect, frame, test } from "./fixtures";
import { hydrated } from "./settle";

// The component gallery (app/(tools)/gallery, plans/component-gallery.md):
// every component and its variants, pictured one by one, so a change to any
// of them shows beside main's, even one no other flow reaches. A flow per
// group of the gallery, about ten frames each. Pressing things is the other
// flows' job; "the gallery's wiring" presses one action and one control to
// show its examples respond.

// Each group of the gallery, and how many flows its frames are split over,
// so no flow has more than MAX_FRAMES. A group that grows past that fails
// below until it gets another flow here.
const GROUPS: [string, number][] = [
  ["ui", 4],
  ["layout", 2],
  ["areas", 2],
  ["home", 2],
  ["blog-donate-events", 2],
  ["campaigns-page", 2],
  ["campaigns-letter", 2],
  ["pages", 3],
  ["track-record", 2],
  ["sentiment", 2],
  ["tools", 1],
  ["collateral", 2],
  ["collateral-kit", 3],
  ["staff", 2],
  ["staff-kit", 1],
];
const MAX_FRAMES = 13;

async function openGallery(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/gallery`, { waitUntil: "domcontentloaded" });
  await hydrated(page);
}

test("the gallery's groups are the ones pictured here", async ({ page }) => {
  await openGallery(page);
  const ids = await page
    .locator("[data-gallery-group]")
    .evaluateAll((sections) => sections.map((section) => section.getAttribute("data-gallery-group")));
  expect(ids).toEqual(GROUPS.map(([id]) => id));
});

for (const [group, parts] of GROUPS) {
  for (let part = 1; part <= parts; part++) {
    const name = parts === 1 ? `gallery: ${group}` : `gallery: ${group} (${part} of ${parts})`;
    test(name, async ({ page }) => {
      await openGallery(page);
      const variants = page.locator(`[data-gallery-group="${group}"] [data-gallery-variant]`);
      const count = await variants.count();
      const from = Math.floor(((part - 1) * count) / parts);
      const to = Math.floor((part * count) / parts);
      expect(to - from, "variants in this flow").toBeGreaterThan(0);
      expect(to - from, "variants in this flow: split the group further").toBeLessThanOrEqual(MAX_FRAMES);
      for (let i = from; i < to; i++) {
        const variant = variants.nth(i);
        await frame(page, (await variant.getAttribute("data-gallery-variant"))!, { of: variant });
      }
    });
  }
}

test("the gallery's wiring: an action is logged, and a control holds its value", async ({ page }) => {
  await openGallery(page);

  // An action: the lightbox's Next, which steps to the next photo and logs it.
  const lightbox = page.locator('[data-gallery-variant^="Lightbox:"]');
  await lightbox.getByRole("button", { name: "Open the lightbox" }).click();
  const dialog = page.getByRole("dialog", { name: "A photo" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Next" }).click();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
  const log = lightbox.getByRole("list", { name: "Event log" });
  await expect(log).toHaveText(["onNext()", "onClose()"].join(""));
  await frame(page, "the lightbox's Next and Close, logged", { of: lightbox });

  // A controlled input: the report's dropdown, picking a region.
  const dropdown = page.locator('[data-gallery-variant^="Dropdown:"]');
  await dropdown.getByRole("button", { name: /Region/ }).click();
  await dropdown.getByRole("option").nth(1).click();
  await expect(dropdown.getByText(/^Value: /)).not.toHaveText('Value: "all"');
  await frame(page, "the dropdown, a region picked", { of: dropdown });
});
