import { BASE, expect, frame, test } from "./fixtures";
import { hydrated } from "./settle";

// The component gallery (app/(tools)/gallery, plans/component-gallery.md):
// its index, then each group's page pictured whole, so a change to any
// component shows beside main's, even one no other flow reaches. Pressing
// things is the other flows' job; "the gallery's wiring" presses one action
// and one control to show its examples respond.

// Each group of the gallery, in its order. A new group fails the first test
// until it's here.
const GROUPS = [
  "ui",
  "layout",
  "areas",
  "home",
  "blog-donate-events",
  "campaigns-page",
  "campaigns-letter",
  "pages",
  "track-record",
  "sentiment",
  "tools",
  "collateral",
  "collateral-kit",
  "staff",
  "staff-kit",
];

// The public pages section leaves the gallery to this one, so this checks
// what it would: no uncaught error and no console error from our own code,
// on any gallery page a flow opens.
let problems: string[] = [];
test.beforeEach(({ page }) => {
  problems = [];
  page.on("console", (message) => {
    const origin = message.location().url;
    if (message.type() === "error" && (!origin || origin.startsWith(BASE))) {
      problems.push(`[error] ${message.text().slice(0, 300)}`);
    }
  });
  page.on("pageerror", (error) => problems.push(`[pageerror] ${String(error).slice(0, 300)}`));
});
test.afterEach(() => {
  expect(problems, "console problems").toEqual([]);
});

/** Opens a gallery page, which search engines are told to leave alone. */
async function open(page: import("@playwright/test").Page, path: string) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await hydrated(page);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex, nofollow/);
}

test("the gallery's index: a card for each group", async ({ page }) => {
  await open(page, "/gallery");
  const hrefs = await page
    .getByRole("main")
    .getByRole("listitem")
    .getByRole("link")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(hrefs).toEqual(GROUPS.map((group) => `/gallery/${group}`));
  await frame(page, "the index");
});

for (const group of GROUPS) {
  test(`gallery: ${group}`, async ({ page }) => {
    await open(page, `/gallery/${group}`);
    await expect(page.locator(`[data-gallery-group="${group}"]`)).toBeVisible();
    await frame(page, group);
  });
}

test("the gallery's wiring: an action is logged, and a control holds its value", async ({ page }) => {
  // An action: the lightbox's Next, which steps to the next photo and logs it.
  await open(page, "/gallery/ui");
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
  await open(page, "/gallery/sentiment");
  const dropdown = page.locator('[data-gallery-variant^="Dropdown:"]');
  await dropdown.getByRole("button", { name: /Region/ }).click();
  await dropdown.getByRole("option").nth(1).click();
  await expect(dropdown.getByText(/^Value: /)).not.toHaveText('Value: "all"');
  await frame(page, "the dropdown, a region picked", { of: dropdown });
});

test("the gallery's component links bring each component to the top", async ({ page }) => {
  await open(page, "/gallery/ui");
  const links = page.getByRole("navigation", { name: "Components" }).getByRole("link");
  // The last is the one with least below it.
  const last = links.last();
  const target = (await last.getAttribute("href"))!;
  await last.click();
  await expect(page).toHaveURL(new RegExp(`${target}$`));
  const header = await page.locator("header").first().boundingBox();
  await expect
    .poll(async () => (await page.locator(target).boundingBox())!.y, {
      message: "the component's top, under the header",
    })
    .toBeLessThan(header!.height + 40);
  await frame(page, "the last component, at the top", { window: true });
});
