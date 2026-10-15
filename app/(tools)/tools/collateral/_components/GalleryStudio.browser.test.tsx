import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { useEffect, useState } from "react";
import { DEFAULT_SLIDE_PHOTO_SETTINGS, EXAMPLE_SLIDE, MAX_SLIDES } from "@/lib/collateral/gallery";
import { serializeGalleryProject, type GalleryProject } from "@/lib/collateral/galleryProject";
import { LIBRARY_PHOTOS } from "@/lib/collateral/photos";
import { DEFAULT_THEME_ID, getTheme } from "@/lib/collateral/themes";
import { canvasFile } from "@/tests/browser/qr-images";
import GalleryStudio from "./GalleryStudio";

const STORAGE_KEY = "pauseai-collateral-gallery-v1";
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const LOGO = getTheme(DEFAULT_THEME_ID).logoSrc;
const EXAMPLE = LIBRARY_PHOTOS.find((p) => p.id === EXAMPLE_SLIDE.photoId)!;

const { downloads, loads } = vi.hoisted(() => ({
  downloads: { zip: vi.fn(), text: vi.fn() },
  // Image addresses that fail to load, and whether the fonts do.
  loads: { failing: [] as string[], fontsFail: false },
}));
vi.mock("@/lib/collateral/export", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/collateral/export")>();
  return {
    ...actual,
    downloadPlatformBundleZip: (...a: unknown[]) => downloads.zip(...a),
    downloadText: (...a: unknown[]) => downloads.text(...a),
  };
});
vi.mock("@/lib/collateral/render", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/collateral/render")>();
  return {
    ...actual,
    loadImage: (src: string) => (loads.failing.includes(src) ? Promise.reject(new Error("no")) : actual.loadImage(src)),
    loadFonts: () => (loads.fontsFail ? Promise.reject(new Error("no")) : actual.loadFonts()),
  };
});

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  downloads.zip.mockReset();
  downloads.text.mockReset();
  loads.failing = [];
  loads.fontsFail = false;
});

const slideThumbs = (c: HTMLElement) => [...c.querySelectorAll(".collateral-filmstrip button")] as HTMLElement[];
const caption = () => page.getByLabelText(/^Caption for slide/).element() as HTMLTextAreaElement;
const heading = (c: HTMLElement) => c.querySelectorAll(".collateral-controls h2")[1].textContent;
const platform = (c: HTMLElement, label: string) =>
  [...c.querySelectorAll(".collateral-choice")]
    .find((l) => l.querySelector("strong")!.textContent === label)!
    .querySelector("input")!;
const meta = (c: HTMLElement) => c.querySelector(".collateral-preview-meta")!.textContent;

async function ready(container: HTMLElement) {
  await expect.element(page.getByRole("button", { name: "Download slides" })).toBeEnabled();
  await expect.poll(() => slideThumbs(container).length).toBeGreaterThan(0);
}

function photo(drawn = true) {
  const canvas = document.createElement("canvas");
  canvas.width = 40;
  canvas.height = 30;
  if (drawn) canvas.getContext("2d")!.fillRect(0, 0, 20, 30);
  return canvas;
}

function setFiles(input: HTMLInputElement, files: File[]) {
  const list = new DataTransfer();
  for (const f of files) list.items.add(f);
  input.files = list.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

const upload = (c: HTMLElement, files: File[]) =>
  setFiles(c.querySelector('input[aria-label="Upload photos"]') as HTMLInputElement, files);
const openFile = (c: HTMLElement, file: File | null) =>
  setFiles(c.querySelector('input[aria-label="Open a saved project"]') as HTMLInputElement, file ? [file] : []);

function setRange(label: string, value: string) {
  const el = page.getByLabelText(label).element() as HTMLInputElement;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

const gallery = (extra: Partial<GalleryProject> = {}): GalleryProject => ({
  slides: [
    {
      photo: { kind: "library", id: LIBRARY_PHOTOS[1].id },
      photoSettings: DEFAULT_SLIDE_PHOTO_SETTINGS,
      caption: "One",
      themeId: "black",
    },
    { photo: null, photoSettings: DEFAULT_SLIDE_PHOTO_SETTINGS, caption: "Two", themeId: "cream" },
  ],
  platforms: ["x"],
  ...extra,
});

describe("GalleryStudio", () => {
  it("starts with an example slide, and downloads every platform's crop in one zip", async () => {
    const { container } = await render(<GalleryStudio />);
    await ready(container);
    await expect.poll(() => caption().value).toBe(EXAMPLE_SLIDE.caption);
    expect(slideThumbs(container).map((b) => b.getAttribute("aria-label"))).toEqual(["Show slide 1", "Show slide 2"]);
    await expect.element(page.getByRole("button", { name: EXAMPLE.label })).toHaveAttribute("aria-pressed", "true");
    expect(meta(container)).toMatch(/^Slide 1 of 2 · Crop for Instagram \/ Facebook · LinkedIn · .* Drag the photo/);
    await page.getByRole("button", { name: "Download slides" }).click();
    await expect.poll(() => downloads.zip.mock.calls.length, { timeout: 15000 }).toBe(1);
    const [groups, name] = downloads.zip.mock.lastCall!;
    expect(name).toBe("pauseai-gallery-platforms.zip");
    expect((groups as { folder: string; kind: string }[]).map((g) => `${g.folder}:${g.kind}`)).toEqual([
      "instagram:images",
      "linkedin:images",
      "linkedin:pdf",
      "x:images",
    ]);
  });

  it("previews each crop the ticked platforms need, and needs one ticked to download", async () => {
    const { container } = await render(<GalleryStudio />);
    await ready(container);
    const crops = page.getByRole("group", { name: "Preview crop" });
    await crops.getByRole("button", { name: "X" }).click();
    await expect.element(crops.getByRole("button", { name: "X" })).toHaveAttribute("aria-pressed", "true");
    expect(meta(container)).toMatch(/Crop for X ·/);
    for (const label of ["Instagram / Facebook", "LinkedIn", "X"]) platform(container, label).click();
    await expect.element(page.getByText("Pick at least one platform.")).toBeVisible();
    await expect.element(page.getByRole("button", { name: "Download slides" })).toBeDisabled();
    expect(meta(container)).not.toMatch(/Crop for/);
    expect(container.querySelector(".collateral-crop-picker")).toBeNull();
    // Only the ticked platforms are downloaded.
    platform(container, "X").click();
    await page.getByRole("button", { name: "Download slides" }).click();
    await expect.poll(() => downloads.zip.mock.calls.length, { timeout: 15000 }).toBe(1);
    expect((downloads.zip.mock.lastCall![0] as { folder: string }[]).map((g) => g.folder)).toEqual(["x"]);
  });

  it("explains a failed download, and says Preparing… meanwhile", async () => {
    let fail: (e: Error) => void = () => {};
    downloads.zip.mockReturnValueOnce(new Promise((_, j) => (fail = j)));
    const { container } = await render(<GalleryStudio />);
    await ready(container);
    await page.getByRole("button", { name: "Download slides" }).click();
    await expect.element(page.getByRole("button", { name: "Preparing…" })).toBeDisabled();
    await expect.poll(() => downloads.zip.mock.calls.length, { timeout: 15000 }).toBe(1);
    fail(new Error("no"));
    await expect.element(page.getByText("Could not create the export. Try again, or with fewer slides.")).toBeVisible();
  });

  it("adds, moves, picks and removes slides, each with its own style and caption", async () => {
    const { container } = await render(<GalleryStudio />);
    await ready(container);
    await expect.element(page.getByRole("button", { name: "Remove", exact: true }).first()).toBeDisabled();
    await expect.element(page.getByRole("button", { name: "← Move earlier" })).toBeDisabled();
    await page.getByRole("button", { name: "Add a slide (2 of 10)" }).click();
    expect(heading(container)).toBe("2. Slide 3 of 3");
    await expect.element(page.getByRole("button", { name: "Move later →" })).toBeDisabled();
    await page.getByLabelText("Caption for slide 3").fill("Third");
    await page.getByRole("radio", { name: "Black" }).click();
    await expect.element(page.getByRole("radio", { name: "Black" })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: "← Move earlier" }).click();
    expect(heading(container)).toBe("2. Slide 2 of 3");
    expect(caption().value).toBe("Third");
    await page.getByRole("button", { name: "Move later →" }).click();
    expect(heading(container)).toBe("2. Slide 3 of 3");
    await page.getByRole("button", { name: "Remove", exact: true }).first().click();
    expect(heading(container)).toBe("2. Slide 2 of 2");
    expect(caption().value).toBe("");
    slideThumbs(container)[0].click();
    await expect.poll(() => caption().value).toBe(EXAMPLE_SLIDE.caption);
    expect(slideThumbs(container)[0].getAttribute("aria-current")).toBe("true");
    // Up to the limit, X keeps only its first four.
    for (let n = 2; n < MAX_SLIDES; n++) await page.getByRole("button", { name: `Add a slide (${n} of 10)` }).click();
    await expect.element(page.getByRole("button", { name: "Add a slide (10 of 10)" })).toBeDisabled();
    await expect.element(page.getByText(/only the first 4 will be included/)).toBeVisible();
  });

  it("sets each slide's photo from the library or uploads, with its crop", async () => {
    const { container } = await render(<GalleryStudio />);
    await ready(container);
    // Remove the example photo, then pick one from the library.
    await page.getByRole("button", { name: "Remove", exact: true }).last().click();
    await expect.element(page.getByRole("button", { name: EXAMPLE.label })).toHaveAttribute("aria-pressed", "false");
    expect(container.querySelector("canvas[role=img]")!.className).toBe("");
    await page.getByRole("button", { name: LIBRARY_PHOTOS[0].label }).click();
    await expect
      .element(page.getByRole("button", { name: LIBRARY_PHOTOS[0].label }))
      .toHaveAttribute("aria-pressed", "true");
    container.querySelector("details.collateral-crop")!.setAttribute("open", "");
    setRange("Zoom", "2");
    await expect.poll(() => (page.getByLabelText("Zoom").element() as HTMLInputElement).value).toBe("2");
    // Scrolling on the preview zooms too.
    const preview = container.querySelector("canvas[role=img]")!;
    preview.dispatchEvent(new WheelEvent("wheel", { deltaY: -200, bubbles: true, cancelable: true }));
    await expect
      .poll(() => Number((page.getByLabelText("Zoom").element() as HTMLInputElement).value))
      .toBeGreaterThan(2);
    loads.failing = [LIBRARY_PHOTOS[1].src];
    await page.getByRole("button", { name: LIBRARY_PHOTOS[1].label }).click();
    await expect.element(page.getByText("Could not load that photo.")).toBeVisible();

    // Nothing picked.
    upload(container, []);
    // Several photos fill this slide and the next, then new slides; one that cannot be read is skipped.
    const good = await canvasFile(photo(), "a.png");
    upload(container, [good, new File(["x"], "bad.png", { type: "image/png" }), good, good]);
    await expect.element(page.getByText("1 image could not be read.")).toBeVisible();
    await expect.poll(() => slideThumbs(container).length).toBe(3);
    await expect.element(page.getByText(/a\.png · stays in your browser/)).toBeVisible();
    // More than fit.
    const bad = new File(["x"], "bad.png", { type: "image/png" });
    upload(container, [bad, bad, ...Array(MAX_SLIDES).fill(good)]);
    await expect
      .element(page.getByText("2 images could not be read. 2 did not fit: a gallery holds 10 slides."))
      .toBeVisible();
    await expect.poll(() => slideThumbs(container).length).toBe(MAX_SLIDES);
    upload(container, [good]);
    await expect.poll(() => container.querySelector(".collateral-message")).toBeNull();
  });

  it("saves and opens project files", async () => {
    const { container } = await render(<GalleryStudio />);
    await ready(container);
    upload(container, [await canvasFile(photo(), "mine.png")]);
    await expect.element(page.getByText(/mine\.png · stays in your browser/)).toBeVisible();
    await page.getByRole("button", { name: "More options" }).click();
    await page.getByRole("button", { name: "Save project file" }).click();
    const [text, name] = downloads.text.mock.lastCall!;
    expect(name).toBe("pauseai-gallery-project.json");
    expect(JSON.parse(text as string).slides[0].photo.dataUrl).toMatch(/^data:image\/jpeg/);
    await expect.element(page.getByText(/Project file saved/)).toBeVisible();
    downloads.text.mockImplementationOnce(() => {
      throw new Error("no");
    });
    await page.getByRole("button", { name: "More options" }).click();
    await page.getByRole("button", { name: "Save project file" }).click();
    await expect.element(page.getByText("Could not save the project.")).toBeVisible();

    await openFile(container, null);
    await openFile(container, new File(["x".repeat(120_000_001)], "big.json"));
    await expect.element(page.getByText("That file is too big to be a saved gallery.")).toBeVisible();
    await openFile(container, new File(["nope"], "bad.json"));
    await expect.element(page.getByText("That file is not a saved gallery project.")).toBeVisible();
    const one = gallery({
      slides: [{ ...gallery().slides[0], photo: { kind: "upload", name: "u.png", dataUrl: PNG } }],
    });
    await openFile(container, new File([serializeGalleryProject(one)], "one.json"));
    await expect.element(page.getByText("Opened one.json.")).toBeVisible();
    // A single slide is topped up to the minimum.
    await expect.poll(() => slideThumbs(container).length).toBe(2);
    await expect.element(page.getByText(/u\.png · stays in your browser/)).toBeVisible();
    expect(platform(container, "X").checked).toBe(true);
    expect(platform(container, "LinkedIn").checked).toBe(false);
    loads.failing = [LIBRARY_PHOTOS[1].src];
    await openFile(container, new File([serializeGalleryProject(gallery())], "two.json"));
    await expect.element(page.getByText("Opened two.json, but some photos could not be loaded.")).toBeVisible();
    expect(caption().value).toBe("One");
  });

  it("starts again with an Undo, without the example photo if it will not load", async () => {
    const { container } = await render(<GalleryStudio />);
    await ready(container);
    await page.getByRole("button", { name: "Add a slide (2 of 10)" }).click();
    await page.getByRole("button", { name: "More options" }).click();
    loads.failing = [EXAMPLE.src];
    await page.getByRole("button", { name: "Start again" }).click();
    await expect.element(page.getByText(/^Started a new gallery\./)).toBeVisible();
    await expect.poll(() => slideThumbs(container).length).toBe(2);
    expect(caption().value).toBe("");
    await page.getByRole("button", { name: "Undo" }).click();
    await expect.poll(() => slideThumbs(container).length).toBe(3);
    expect(heading(container)).toBe("2. Slide 3 of 3");
  });

  it("restores the last session, keeps saving, and copes with blocked or corrupt storage", async () => {
    localStorage.setItem(STORAGE_KEY, serializeGalleryProject(gallery()));
    const first = await render(<GalleryStudio />);
    await ready(first.container);
    await expect.poll(() => caption().value).toBe("One");
    await page.getByLabelText("Caption for slide 1").fill("Changed");
    await expect.poll(() => JSON.parse(localStorage.getItem(STORAGE_KEY)!).slides[0].caption).toBe("Changed");
    await first.unmount();
    localStorage.setItem(STORAGE_KEY, "garbage");
    const second = await render(<GalleryStudio />);
    await ready(second.container);
    await expect.poll(() => caption().value).toBe(EXAMPLE_SLIDE.caption);
    await second.unmount();
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new DOMException("blocked");
      },
      setItem: () => {
        throw new DOMException("blocked");
      },
    });
    const third = await render(<GalleryStudio />);
    await ready(third.container);
    expect(slideThumbs(third.container)).toHaveLength(2);
  });

  it("says when the logo will not load, and works without the fonts", async () => {
    loads.fontsFail = true;
    const { container } = await render(<GalleryStudio />);
    await ready(container);
    await expect.element(page.getByRole("img", { name: "Preview of slide 1 of 2" })).toBeVisible();
  });

  it("says when the logo will not load, and waits for it", async () => {
    loads.failing = [LOGO];
    const { container } = await render(<GalleryStudio />);
    await expect.element(page.getByText("Could not load the logo.")).toBeVisible();
    expect(container.querySelector(".collateral-loading")?.textContent).toBe("Loading…");
    await expect.element(page.getByRole("button", { name: "Download slides" })).toBeDisabled();
  });

  it.each([
    ["everything loads", [] as string[]],
    ["the logo fails", ["logo"]],
  ])("stops loading if it goes before that finishes, when %s", async (_, failing) => {
    loads.failing = failing.map(() => LOGO);
    function Gone() {
      const [shown, setShown] = useState(true);
      useEffect(() => setShown(false), []);
      return shown ? <GalleryStudio /> : <p>gone</p>;
    }
    await render(<Gone />);
    await expect.element(page.getByText("gone")).toBeVisible();
    await new Promise((r) => setTimeout(r, 100));
  });
});
