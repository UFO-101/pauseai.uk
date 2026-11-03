import { readFileSync } from "node:fs";
import type { Download, Page } from "@playwright/test";
import JSZip from "jszip";
import { BASE, expect, frame, story, test } from "./fixtures";
import { wholePage } from "./settle";

// The collateral maker (/tools/collateral), as a volunteer uses it before a
// protest: one flow per studio, from a blank page to the files downloaded.
// The drawing and the exports are tested piece by piece in Vitest's browser
// project; these show the whole of each studio working on a real build.

const PAGE = `${BASE}/tools/collateral`;

/** Opens the maker, in `studio`, once the preview has drawn and can be downloaded. */
async function open(page: Page, studio: string, download: RegExp) {
  await page.goto(PAGE);
  await page.getByRole("radio", { name: studio }).click();
  await expect(page.getByRole("radio", { name: studio })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("button", { name: download })).toBeEnabled();
  await expect(page.getByText("Loading…")).toHaveCount(0);
}

/** Clicks `name` and returns the file it downloads. */
async function download(page: Page, name: string | RegExp): Promise<Download> {
  const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name }).click()]);
  return file;
}

/** The names of the files in a downloaded zip. */
async function zipNames(file: Download): Promise<string[]> {
  const zip = await JSZip.loadAsync(readFileSync((await file.path())!));
  return Object.keys(zip.files)
    .filter((name) => !zip.files[name].dir)
    .sort();
}

test("An image for an event", async ({ page }) => {
  story("A volunteer opens the collateral maker to make an image for their protest.");
  await open(page, "Single image", /^Download PNG$/);
  await frame(page, "The collateral maker");
  story("They pick the London protest from our events. That fills in its title, and a QR code for its page.");

  // One of our events fills in the Event layout, with a QR code for it.
  const event = page.locator("#collateral-import-event");
  const option = event.locator("option", { hasText: "PauseAI London: Protest at Parliament" });
  await event.selectOption((await option.getAttribute("value"))!);
  await expect(page.getByRole("radio", { name: /^Event/ })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByLabel("Event title")).toHaveValue("PauseAI London: Protest at Parliament");
  await expect(page.getByLabel("QR code 1 web address")).toHaveValue(/lu\.ma\//);
  await frame(page, "The London protest, filled in");
  story("They add a photo of the London protest group and choose black. The photo can be dragged to move it.");

  await page.getByRole("button", { name: "London protest group" }).click();
  await page.getByRole("radio", { name: "Black" }).click();
  // With a photo, the preview can be dragged to move it.
  await expect(page.getByRole("img", { name: /^Preview of/ })).toHaveCSS("cursor", "grab");
  await frame(page, "With a photo, in black");
  story("They download it as a PNG, then make it an A5 flyer and download a PDF to print.");

  const png = await download(page, /^Download PNG$/);
  expect(png.suggestedFilename()).toBe("pauseai-event-ig-square-black.png");
  expect(
    readFileSync((await png.path())!)
      .subarray(1, 4)
      .toString(),
  ).toBe("PNG");

  await page.getByLabel("Where will it be used?").selectOption("a5");
  await frame(page, "As an A5 flyer");
  const pdf = await download(page, /^Download print PDF/);
  expect(pdf.suggestedFilename()).toBe("pauseai-event-a5-black.pdf");
  expect(
    readFileSync((await pdf.path())!)
      .subarray(0, 5)
      .toString(),
  ).toBe("%PDF-");

  story("The maker keeps their work in the browser. When they open it again, it's as they left it.");
  // Kept in the browser: opening it again carries on where they were.
  await page.goto(PAGE);
  await expect(page.getByLabel("Event title")).toHaveValue("PauseAI London: Protest at Parliament");
  await expect(page.getByLabel("Where will it be used?")).toHaveValue("a5");
  await expect(page.getByRole("button", { name: /^Download print PDF/ })).toBeEnabled();
  await frame(page, "Opened again");
});

test("A campaign pack", async ({ page }) => {
  story("A volunteer makes a campaign pack: one design in six formats.");
  await open(page, "Campaign pack", /^Download 6 formats \(\.zip\)$/);
  await frame(page, "The campaign pack");
  story("They give it a title, add an A4 poster and take out the X header.");

  await page.getByRole("textbox", { name: "Event title" }).fill("Pause frontier AI now");
  await page.getByRole("checkbox", { name: /A4 poster/ }).check();
  await page.getByRole("checkbox", { name: /X header/ }).uncheck();
  await expect(page.getByRole("button", { name: "Download 6 formats (.zip)" })).toBeEnabled();
  await wholePage(page);
  await frame(page, "The pack, with a title and an A4 poster");
  story("They pick the Luma event cover from the previews to adjust it on its own.");

  // The Luma cover, picked from the previews, is adjusted on its own.
  await page
    .getByRole("group", { name: /^Formats in the pack/ })
    .getByRole("button", { name: /^Luma event cover/ })
    .click();
  await expect(page.getByRole("heading", { name: "Adjust Luma event cover" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Preview of Luma event cover" })).toBeVisible();
  await wholePage(page);
  await frame(page, "The Luma event cover");
  story("They download the pack as a zip, with the formats they chose.");

  const zip = await download(page, "Download 6 formats (.zip)");
  expect(zip.suggestedFilename()).toBe("pauseai-event-pack.zip");
  const names = await zipNames(zip);
  expect(names).toHaveLength(8);
  expect(names.filter((name) => name.endsWith(".pdf"))).toHaveLength(2);
  expect(names.join(" ")).not.toContain("x-header");
  expect(names.join(" ")).toContain("a4");
});

test("Slides for a carousel", async ({ page }) => {
  story("A volunteer makes a set of slides to post as a carousel. It starts with two example slides.");
  await open(page, "Gallery / carousel", /^Download slides$/);
  await frame(page, "Two example slides");
  story(
    "They caption the first slide, then add a third with a photo of the DeepMind protest, in cream, with its own caption.",
  );

  await page.getByLabel("Caption for slide 1").fill("Thousands marched");
  await page.getByRole("button", { name: /^Add a slide/ }).click();
  await expect(page.getByRole("img", { name: "Preview of slide 3 of 3" })).toBeVisible();
  await page.getByRole("button", { name: "DeepMind protest" }).click();
  await page.getByRole("radio", { name: "Cream" }).click();
  await page.getByLabel("Caption for slide 3").fill("Outside Google DeepMind");
  // Where the clicks above leave the window varies from run to run, and the
  // frame with it. At the top, it pictures the whole studio instead.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await frame(page, "Three slides");
  story("They move the third slide earlier, to second.");

  await page.getByRole("button", { name: "Show slide 3" }).click();
  await page.getByRole("button", { name: "← Move earlier" }).click();
  await expect(page.getByLabel("Caption for slide 2")).toHaveValue("Outside Google DeepMind");
  await frame(page, "The slide, moved to second");
  story("They leave out LinkedIn and download the slides as a zip, with a folder for each of the other platforms.");

  await page.getByRole("checkbox", { name: /LinkedIn/ }).uncheck();
  const zip = await download(page, "Download slides");
  expect(zip.suggestedFilename()).toBe("pauseai-gallery-platforms.zip");
  const names = await zipNames(zip);
  expect(names.some((name) => name.startsWith("instagram/"))).toBe(true);
  expect(names.some((name) => name.startsWith("x/"))).toBe(true);
  expect(names.some((name) => name.startsWith("linkedin/"))).toBe(false);
});
