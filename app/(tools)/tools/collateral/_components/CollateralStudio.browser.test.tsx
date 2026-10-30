import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { useEffect, useState } from "react";
import { page } from "vitest/browser";
import { LIBRARY_PHOTOS } from "@/lib/collateral/photos";
import { serializeProject, type Project } from "@/lib/collateral/project";
import CollateralStudio from "./CollateralStudio";
import { designToData, newDesign } from "./designState";

const STORAGE_KEY = "pauseai-collateral-v2";

const { downloads } = vi.hoisted(() => ({
  downloads: { png: vi.fn(), pdf: vi.fn(), text: vi.fn() },
}));
vi.mock("@/lib/collateral/export", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/collateral/export")>();
  return {
    ...actual,
    downloadCanvasPng: (...a: unknown[]) => downloads.png(...a),
    downloadCanvasPdf: (...a: unknown[]) => downloads.pdf(...a),
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
  for (const fn of Object.values(downloads)) fn.mockReset();
});

const project = (extra: Partial<Project> = {}): Project => ({
  ...designToData(newDesign(), false),
  formatId: "a5",
  photoSettings: { zoom: 1.5, focalX: 0.3, focalY: 0.7 },
  headlineScale: 1.2,
  screenQr: true,
  ...extra,
});

async function ready() {
  await expect.element(page.getByRole("img", { name: /Preview of/ })).toBeVisible();
  await expect.element(page.getByRole("button", { name: "Download PNG" })).toBeEnabled();
}

async function openFile(container: HTMLElement, file: File) {
  const input = container.querySelector('input[aria-label="Open a saved project"]') as HTMLInputElement;
  const list = new DataTransfer();
  list.items.add(file);
  input.files = list.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("CollateralStudio", () => {
  it("shows a live preview with its checks, and downloads a PNG", async () => {
    await render(<CollateralStudio events={[]} />);
    await ready();
    await expect.element(page.getByText("Loading…")).not.toBeInTheDocument();
    expect(page.getByRole("status").element().textContent).toMatch(/^Checks/);
    await page.getByRole("button", { name: "Download PNG" }).click();
    await expect.poll(() => downloads.png.mock.lastCall?.[1]).toBe("pauseai-announcement-ig-square-orange.png");
  });

  it("offers a print PDF on print formats, and explains download failures", async () => {
    await render(<CollateralStudio events={[]} />);
    await ready();
    await expect.element(page.getByRole("button", { name: /Download print PDF/ })).not.toBeInTheDocument();
    await page.getByLabelText("Where will it be used?").selectOptions("a5");
    await page.getByRole("button", { name: "Download print PDF (+3 mm bleed)" }).click();
    await expect.poll(() => downloads.pdf.mock.lastCall?.[3]).toBe("pauseai-announcement-a5-orange.pdf");
    expect(downloads.pdf.mock.lastCall![1]).toMatchObject({ id: "a5", widthMm: 148 });
    downloads.pdf.mockRejectedValueOnce(new Error("no"));
    await page.getByRole("button", { name: /Download print PDF/ }).click();
    await expect
      .element(page.getByText("Could not create the PDF. Try again, or download the PNG instead."))
      .toBeVisible();
    downloads.png.mockRejectedValueOnce(new Error("no"));
    await page.getByRole("button", { name: "Download PNG" }).click();
    await expect.element(page.getByText("Could not create the image. Try a smaller format.")).toBeVisible();
  });

  it("shows the pressed download pending while it's made", async () => {
    let finish: () => void = () => {};
    downloads.png.mockReturnValueOnce(new Promise<void>((r) => (finish = r)));
    await render(<CollateralStudio events={[]} />);
    await ready();
    await page.getByRole("button", { name: "Download PNG" }).click();
    await expect.element(page.getByRole("button", { name: "Download PNG" })).toHaveAttribute("aria-busy", "true");
    finish();
    await expect.element(page.getByRole("button", { name: "Download PNG" })).toBeEnabled();
  });

  it("shows the Luma cover's options and format notes", async () => {
    const { container } = await render(<CollateralStudio events={[]} />);
    await ready();
    await page.getByLabelText("Where will it be used?").selectOptions("luma-cover");
    await expect.element(page.getByText("Show the event title on the Luma cover")).toBeVisible();
    expect(container.textContent).toContain("Luma shows this about 280px wide");
  });

  it("shows QR codes on a social post once one is added, and opens the title size when it's flagged", async () => {
    await render(<CollateralStudio events={[]} />);
    await ready();
    await page.getByRole("button", { name: "Add a QR code" }).click();
    await expect.element(page.getByRole("checkbox", { name: /Show QR codes on the/ })).toBeChecked();
    // One word as long as the field allows, of the widest letter: it overflows in any font, so the check
    // doesn't depend on text measurement.
    await page.getByLabelText("Headline").fill("W".repeat(90));
    await expect.poll(() => page.getByText("Adjust title size").element().closest("details")!.open).toBe(true);
  });

  it("lets the photo be dragged, cropped, and starts a new photo's crop afresh", async () => {
    await render(<CollateralStudio events={[]} />);
    await ready();
    await page.getByRole("button", { name: LIBRARY_PHOTOS[0].label }).click();
    await expect.element(page.getByText(/Drag the photo to move it/)).toBeVisible();
    // The cursor says it can be dragged.
    expect(getComputedStyle(page.getByRole("img", { name: /Preview of/ }).element()).cursor).toBe("grab");
    page.getByText("Fine-tune the crop").element().closest("details")!.setAttribute("open", "");
    const zoom = page.getByLabelText("Zoom").element() as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(zoom, "2");
    zoom.dispatchEvent(new Event("input", { bubbles: true }));
    await expect.poll(() => (page.getByLabelText("Zoom").element() as HTMLInputElement).value).toBe("2");
    // A second change builds on the first.
    const left = page.getByLabelText("Left / right").element() as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(left, "0.2");
    left.dispatchEvent(new Event("input", { bubbles: true }));
    await expect.poll(() => (page.getByLabelText("Left / right").element() as HTMLInputElement).value).toBe("0.2");
    expect((page.getByLabelText("Zoom").element() as HTMLInputElement).value).toBe("2");
    await page.getByRole("button", { name: LIBRARY_PHOTOS[1].label }).click();
    await expect.poll(() => (page.getByLabelText("Zoom").element() as HTMLInputElement).value).toBe("1");
  });

  it("saves a project file, and says if it can't", async () => {
    await render(<CollateralStudio events={[]} />);
    await ready();
    await page.getByRole("button", { name: "More options" }).click();
    await page.getByRole("button", { name: "Save project file" }).click();
    expect(downloads.text.mock.lastCall![1]).toBe("pauseai-announcement-ig-square-project.json");
    expect(JSON.parse(downloads.text.mock.lastCall![0])).toMatchObject({ formatId: "ig-square" });
    await expect.element(page.getByText(/Project file saved/)).toBeVisible();
    downloads.text.mockImplementationOnce(() => {
      throw new Error("no");
    });
    await page.getByRole("button", { name: "More options" }).click();
    await page.getByRole("button", { name: "Save project file" }).click();
    await expect.element(page.getByText("Could not save the project.")).toBeVisible();
  });

  it("opens a project file, rejecting ones that are too big or not projects", async () => {
    const { container } = await render(<CollateralStudio events={[]} />);
    await ready();
    // Cancelling the picker does nothing.
    const input = container.querySelector('input[aria-label="Open a saved project"]') as HTMLInputElement;
    input.files = new DataTransfer().files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await openFile(container, new File(["x".repeat(12_000_001)], "big.json"));
    await expect.element(page.getByText("That file is too big to be a saved project.")).toBeVisible();
    await openFile(container, new File(["not json"], "bad.json"));
    await expect.element(page.getByText("That file is not a saved collateral project.")).toBeVisible();
    const withLogo = project({
      partnerLogos: [
        {
          name: "p.png",
          dataUrl:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        },
      ],
    });
    await openFile(container, new File([serializeProject(withLogo)], "mine.json"));
    await expect.element(page.getByText("Opened mine.json.")).toBeVisible();
    await expect.element(page.getByLabelText("Where will it be used?")).toHaveValue("a5");
    const broken = project({ photo: { kind: "upload", name: "u", dataUrl: "data:image/png;base64,AAAA" } });
    await openFile(container, new File([serializeProject(broken)], "broken.json"));
    await expect.element(page.getByText("Opened broken.json, but an image in it could not be loaded.")).toBeVisible();
  });

  it("starts again from the example text, with an Undo", async () => {
    await render(<CollateralStudio events={[]} />);
    await ready();
    await page.getByLabelText("Headline").fill("My headline");
    await page.getByRole("button", { name: "More options" }).click();
    await page.getByRole("button", { name: "Start again" }).click();
    await expect.element(page.getByText(/^Reset to the example text\./)).toBeVisible();
    await expect.element(page.getByLabelText("Headline")).not.toHaveValue("My headline");
    await page.getByRole("button", { name: "Undo" }).click();
    await expect.element(page.getByLabelText("Headline")).toHaveValue("My headline");
    await expect.element(page.getByRole("button", { name: "Undo" })).not.toBeInTheDocument();
  });

  it("restores the last session from the browser, and keeps saving to it", async () => {
    localStorage.setItem(STORAGE_KEY, serializeProject(project()));
    await render(<CollateralStudio events={[]} />);
    await expect.element(page.getByLabelText("Where will it be used?")).toHaveValue("a5");
    await page.getByLabelText("Where will it be used?").selectOptions("story");
    await expect.poll(() => JSON.parse(localStorage.getItem(STORAGE_KEY)!).formatId).toBe("story");
  });

  it("ignores a corrupt session, and works when storage is blocked", async () => {
    localStorage.setItem(STORAGE_KEY, "garbage");
    const { unmount } = await render(<CollateralStudio events={[]} />);
    await ready();
    await unmount();
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new DOMException("blocked");
      },
      setItem: () => {
        throw new DOMException("blocked");
      },
    });
    await render(<CollateralStudio events={[]} />);
    await ready();
    await page.getByLabelText("Headline").fill("Still works");
  });

  it("stops restoring if it goes before that finishes", async () => {
    localStorage.setItem(STORAGE_KEY, serializeProject(project()));
    // Unmounts the studio straight after its first effects, while the restore is waiting on the saved project.
    function Gone() {
      const [shown, setShown] = useState(true);
      useEffect(() => setShown(false), []);
      return shown ? <CollateralStudio events={[]} /> : <p>gone</p>;
    }
    await render(<Gone />);
    await expect.element(page.getByText("gone")).toBeVisible();
    await new Promise((r) => setTimeout(r, 50));
  });
});
