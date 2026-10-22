import { BASE, expect, frame, test } from "./fixtures";
import { hydrated } from "./settle";

// The component gallery (app/(tools)/gallery):
// its index, then each group's page pictured whole, so a change to any
// component shows beside main's, even one no other flow reaches. Pressing
// things is the other flows' job, and the examples' own Vitest tests'.

// Each group of the gallery, in its order. A new group fails the first test
// until it's here.
const GROUPS = [
  "tokens",
  "ui",
  "forms",
  "layout",
  "areas",
  "home",
  "blog-donate-events",
  "campaigns-page",
  "campaigns-letter",
  "pages",
  "march-signup",
  "track-record",
  "sentiment",
  "tools",
  "collateral",
  "collateral-kit",
  "staff",
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
