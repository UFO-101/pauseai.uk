import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { useEffect, useState } from "react";
import {
  DEFAULT_PACK_FORMAT_IDS,
  newPackOutput,
  serializePackProject,
  type PackProject,
} from "@/lib/collateral/packProject";
import { LIBRARY_PHOTOS } from "@/lib/collateral/photos";
import { designToData, newDesign } from "./designState";
import type { LintIssue } from "@/lib/collateral/lint";
import type { RenderOptions } from "@/lib/collateral/render";
import { nextCall } from "@/tests/browser/next-call";
import PackStudio from "./PackStudio";

const STORAGE_KEY = "pauseai-collateral-pack-v1";
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const { downloads, extraIssues } = vi.hoisted(() => ({
  downloads: { zip: vi.fn(), text: vi.fn() },
  // Checks to add to a format's own, so each kind of result can be shown without crafting a design that fails it.
  extraIssues: { byFormat: {} as Record<string, LintIssue[]> },
}));
vi.mock("@/lib/collateral/render", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/collateral/render")>();
  return {
    ...actual,
    renderCollateral: (canvas: HTMLCanvasElement, opts: RenderOptions) => {
      const result = actual.renderCollateral(canvas, opts);
      return opts.lint
        ? { ...result, issues: [...(extraIssues.byFormat[opts.format.id] ?? []), ...result.issues] }
        : result;
    },
  };
});
vi.mock("@/lib/collateral/export", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/collateral/export")>();
  return {
    ...actual,
    downloadFilesZip: (...a: unknown[]) => downloads.zip(...a),
    downloadText: (...a: unknown[]) => downloads.text(...a),
  };
});

beforeEach(async () => {
  localStorage.clear();
  // Wide, so the preview sits beside the form rather than pinned over it.
  await page.viewport(1280, 900);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  downloads.zip.mockReset();
  downloads.text.mockReset();
  extraIssues.byFormat = {};
});

const pack = (formatIds = ["ig-square", "a6"], extra: Partial<PackProject> = {}): PackProject => ({
  ...designToData(newDesign("event"), false),
  outputs: formatIds.map((id) => ({ ...newPackOutput(id), headlineScale: 1.1, screenQr: true })),
  ...extra,
});

const thumbs = (c: HTMLElement) =>
  [...c.querySelectorAll('[aria-label^="Formats in the pack"] button')] as HTMLElement[];
/** A preview's label, then its badge. */
const label = (thumb: HTMLElement) => thumb.querySelectorAll("span")[0];
const badgeOf = (thumb: HTMLElement) => thumb.querySelectorAll("span")[1];
const summary = () => page.getByTestId("pack-summary").element().textContent;
const titleSize = () => page.getByText("Adjust title size").element().closest("details")!;
const screenQr = () => page.getByRole("checkbox", { name: /^Show QR codes on the/ });

async function ready(container: HTMLElement) {
  await expect.poll(() => thumbs(container).length).toBe(DEFAULT_PACK_FORMAT_IDS.length);
}

async function openFile(container: HTMLElement, file: File | null) {
  const input = container.querySelector('input[aria-label="Open a saved pack"]') as HTMLInputElement;
  const list = new DataTransfer();
  if (file) list.items.add(file);
  input.files = list.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("PackStudio", () => {
  it("shows every ticked format with its checks, and downloads them all in a zip with print PDFs", async () => {
    const { container } = await render(<PackStudio events={[]} />);
    await ready(container);
    await expect.poll(() => thumbs(container).every((t) => badgeOf(t).textContent !== "")).toBe(true);
    await expect.element(page.getByText(/passed (its|the) checks|need a look/)).toBeVisible();
    // Building every format is slow on a busy CI runner: wait for the zip itself.
    const zipped = nextCall(downloads.zip);
    await page.getByRole("button", { name: /Download \d+ formats \(\.zip\)/ }).click();
    const [files, name] = await zipped;
    expect(name).toBe("pauseai-event-pack.zip");
    const names = (files as { name: string }[]).map((f) => f.name);
    expect(names).toContain(`${DEFAULT_PACK_FORMAT_IDS[0]}.png`);
    expect(names.some((n) => n.endsWith("-print.pdf"))).toBe(names.some((n) => /^a\d/.test(n)));
  });

  it("explains a failed download, pending meanwhile", async () => {
    let fail: (e: Error) => void = () => {};
    // Failed only once the zip is asked for, or the rejection goes unhandled meanwhile.
    const zipping = nextCall(downloads.zip, () => new Promise((_, j) => (fail = j)));
    const { container } = await render(<PackStudio events={[]} />);
    await ready(container);
    const download = page.getByRole("button", { name: /Download \d+ formats/ });
    await download.click();
    await expect.element(download).toHaveAttribute("aria-busy", "true");
    await zipping;
    fail(new Error("no"));
    await expect.element(page.getByText("Could not create the pack. Try with fewer formats.")).toBeVisible();
  });

  it("picks formats, adjusting one at a time", async () => {
    const { container } = await render(<PackStudio events={[]} />);
    await ready(container);
    thumbs(container)[1].click();
    await expect.poll(() => thumbs(container)[1].getAttribute("aria-current")).toBe("true");
    const second = label(thumbs(container)[1]).textContent!;
    await expect.element(page.getByRole("heading", { name: `Adjust ${second}` })).toBeVisible();
    // Untick everything: nothing to download or adjust.
    for (const box of [...container.querySelectorAll<HTMLInputElement>("fieldset input:checked")]) box.click();
    await expect.poll(summary).toBe("Tick at least one format.");
    await expect.element(page.getByRole("button", { name: "Download 0 formats (.zip)" })).toBeDisabled();
    // Said in the summary, and where the preview was.
    expect(page.getByText("Tick at least one format.").elements()).toHaveLength(2);
    // One format.
    (container.querySelector('fieldset input[type="checkbox"]') as HTMLInputElement).click();
    await expect.element(page.getByRole("button", { name: "Download 1 format (.zip)" })).toBeVisible();
  });

  it("nudges a format's title size, shows its QR codes and the Luma cover options", async () => {
    const { container } = await render(<PackStudio events={[]} />);
    await ready(container);
    titleSize().open = true;
    await page.getByRole("button", { name: "Bigger title" }).click();
    await expect.element(page.getByText("110%")).toBeVisible();
    await page.getByRole("button", { name: "Add a QR code" }).click();
    const lumaBox = [...container.querySelectorAll<HTMLLabelElement>("fieldset label")].find((l) =>
      l.textContent!.includes("Luma"),
    )!;
    if (!lumaBox.querySelector("input")!.checked) lumaBox.querySelector("input")!.click();
    await expect.element(page.getByText("Show the event title on the Luma cover")).toBeVisible();
    // Pick a social format to see its QR note and toggle it.
    const social = thumbs(container).find((t) => /Instagram|X|Story|Facebook/.test(t.textContent!))!;
    social.click();
    await expect.poll(() => screenQr().query()).not.toBeNull();
    const toggle = screenQr().element() as HTMLInputElement;
    const before = toggle.checked;
    toggle.click();
    await expect.poll(() => (screenQr().element() as HTMLInputElement).checked).toBe(!before);
  });

  it("lets the active format's photo crop be set on its own", async () => {
    const { container } = await render(<PackStudio events={[]} />);
    await ready(container);
    await page.getByRole("button", { name: LIBRARY_PHOTOS[0].label }).click();
    await expect.element(page.getByText(/Drag the photo to fit this format/)).toBeVisible();
    page.getByText("Fine-tune the crop").element().closest("details")!.setAttribute("open", "");
    for (const [label, value] of [
      ["Zoom", "2"],
      ["Up / down", "0.1"],
    ]) {
      const el = page.getByLabelText(label).element() as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      await expect.poll(() => (page.getByLabelText(label).element() as HTMLInputElement).value).toBe(value);
    }
    thumbs(container)[1].click();
    await expect.poll(() => (page.getByLabelText("Zoom").element() as HTMLInputElement).value).toBe("1");
    // A new photo starts every crop afresh.
    thumbs(container)[0].click();
    await page.getByRole("button", { name: LIBRARY_PHOTOS[1].label }).click();
    await expect.poll(() => (page.getByLabelText("Zoom").element() as HTMLInputElement).value).toBe("1");
  });

  it("saves and opens pack files", async () => {
    const { container } = await render(<PackStudio events={[]} />);
    await ready(container);
    await page.getByRole("button", { name: "More options" }).click();
    await page.getByRole("button", { name: "Save pack file" }).click();
    expect(downloads.text.mock.lastCall![1]).toBe("pauseai-event-pack-project.json");
    await expect.element(page.getByText(/Pack file saved/)).toBeVisible();
    downloads.text.mockImplementationOnce(() => {
      throw new Error("no");
    });
    await page.getByRole("button", { name: "More options" }).click();
    await page.getByRole("button", { name: "Save pack file" }).click();
    await expect.element(page.getByText("Could not save the pack.")).toBeVisible();

    await openFile(container, null);
    await openFile(container, new File(["x".repeat(12_000_001)], "big.json"));
    await expect.element(page.getByText("That file is too big to be a saved pack.")).toBeVisible();
    await openFile(container, new File(["nope"], "bad.json"));
    await expect.element(page.getByText("That file is not a saved campaign pack.")).toBeVisible();
    await openFile(
      container,
      new File(
        [serializePackProject(pack(["ig-square"], { partnerLogos: [{ name: "p", dataUrl: PNG }] }))],
        "mine.json",
      ),
    );
    await expect.element(page.getByText("Opened mine.json.")).toBeVisible();
    await expect.poll(() => thumbs(container).length).toBe(1);
    const broken = pack(["a6"], { photo: { kind: "upload", name: "u", dataUrl: "data:image/png;base64,AAAA" } });
    await openFile(container, new File([serializePackProject(broken)], "broken.json"));
    await expect.element(page.getByText("Opened broken.json, but an image in it could not be loaded.")).toBeVisible();
  });

  it("starts again with an Undo", async () => {
    const { container } = await render(<PackStudio events={[]} />);
    await ready(container);
    await page.getByLabelText("Event title").fill("Mine");
    await page.getByRole("button", { name: "More options" }).click();
    await page.getByRole("button", { name: "Start again" }).click();
    await expect.element(page.getByText(/^Reset to the example text\./)).toBeVisible();
    await page.getByRole("button", { name: "Undo" }).click();
    await expect.element(page.getByLabelText("Event title")).toHaveValue("Mine");
  });

  it("restores the last session, keeps saving, and copes with blocked or corrupt storage", async () => {
    localStorage.setItem(STORAGE_KEY, serializePackProject(pack(["ig-square", "a6"])));
    const first = await render(<PackStudio events={[]} />);
    await expect.poll(() => thumbs(first.container).length).toBe(2);
    await expect.poll(() => JSON.parse(localStorage.getItem(STORAGE_KEY)!).outputs.length).toBe(2);
    await first.unmount();
    localStorage.setItem(STORAGE_KEY, "garbage");
    const second = await render(<PackStudio events={[]} />);
    await ready(second.container);
    await second.unmount();
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new DOMException("blocked");
      },
      setItem: () => {
        throw new DOMException("blocked");
      },
    });
    const third = await render(<PackStudio events={[]} />);
    await ready(third.container);
  });

  it("stops restoring if it goes before that finishes", async () => {
    localStorage.setItem(STORAGE_KEY, serializePackProject(pack()));
    function Gone() {
      const [shown, setShown] = useState(true);
      useEffect(() => setShown(false), []);
      return shown ? <PackStudio events={[]} /> : <p>gone</p>;
    }
    await render(<Gone />);
    await expect.element(page.getByText("gone")).toBeVisible();
    await new Promise((r) => setTimeout(r, 50));
  });

  it("counts each format's own checks on its badge, and lists checks for every format once", async () => {
    const warn = (id: string, scope?: "design"): LintIssue => ({ id, level: "warn", message: `Warning ${id}.`, scope });
    const info: LintIssue = { id: "blurb-dropped", level: "info", message: "Left out." };
    // The first three previews, in the order they show.
    extraIssues.byFormat = {
      "ig-square": [warn("title-small"), warn("text-overflow")],
      story: [info],
      "fb-event": [warn("qr-duplicate", "design")],
    };
    const { container } = await render(<PackStudio events={[]} />);
    await ready(container);
    const badge = (i: number) => badgeOf(thumbs(container)[i]);
    await expect.poll(() => badge(0).textContent).toBe("⚠ 2");
    expect(badge(1).textContent).toBe("ℹ 1");
    // A warning's badge is coloured; a note's is like a clean one's.
    const background = (i: number) => getComputedStyle(badge(i)).backgroundColor;
    expect(background(0)).not.toBe(background(1));
    expect(background(1)).toBe(background(2));
    expect(badge(2).textContent).toBe("✓");
    await expect
      .poll(summary)
      .toBe(`1 problem affects every format. 1 of ${DEFAULT_PACK_FORMAT_IDS.length} formats need a look of their own.`);
    // A flagged title opens the format's size control.
    expect(titleSize().open).toBe(false);
    thumbs(container)[0].click();
    await expect.poll(() => titleSize().open).toBe(true);
    await expect.element(page.getByText("Checks for every format")).toBeVisible();
  });

  it("says the rest passed when only the design has problems", async () => {
    const warn = (id: string): LintIssue => ({ id, level: "warn", message: `Warning ${id}.`, scope: "design" });
    extraIssues.byFormat = { "ig-square": [warn("link-in-headline"), warn("qr-duplicate")] };
    const { container } = await render(<PackStudio events={[]} />);
    await ready(container);
    await expect.poll(summary).toBe("2 problems affect every format. Otherwise every format passed its checks.");
  });
});
