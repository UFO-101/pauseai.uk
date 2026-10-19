// The collateral maker's gallery examples work: each control changes the value
// shown under it, and each action adds its line to the event log.
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { LIBRARY_PHOTOS } from "@/lib/collateral/photos";
import { THEMES } from "@/lib/collateral/themes";
import {
  CheckboxChoicesExample,
  DownloadButtonExample,
  PhotoLibraryExample,
  PreviewCanvasReadyExample,
  RadioChoicesExample,
} from "./collateral-kit.client";
import {
  CropControlsExample,
  DesignControlsEventExample,
  DesignControlsNewExample,
  LogoCoverNoPhotoExample,
  LogoCoverPhotoExample,
  ProjectMenuExample,
  ProjectMenuSaveDisabledExample,
  SliderExample,
  StylePickerExample,
} from "./collateral.client";

beforeEach(async () => {
  await page.viewport(1280, 900);
});

const value = () => page.getByText(/^Value: /);
const log = () => page.getByRole("list", { name: "Event log" }).getByRole("listitem");

/** Moves a range input, as dragging it does. */
function slide(input: HTMLInputElement, to: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, to);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("the collateral maker's examples", () => {
  it("moves the slider", async () => {
    await render(<SliderExample />);
    slide(page.getByRole("slider", { name: "Example" }).element() as HTMLInputElement, "0.8");
    await expect.element(value()).toHaveTextContent("Value: 0.8");
  });

  it("zooms the crop", async () => {
    await render(<CropControlsExample />);
    await page.getByText("Fine-tune the crop").click();
    slide(page.getByRole("slider", { name: "Zoom" }).element() as HTMLInputElement, "2");
    await expect.element(value()).toMatchTextContent('"zoom":2');
  });

  it("hides the cover's title, and clears its photo", async () => {
    await render(<LogoCoverNoPhotoExample />);
    await page.getByRole("checkbox").click();
    await expect.element(value()).toMatchTextContent('"coverTitle":false');
  });

  it("clears the cover's photo", async () => {
    await render(<LogoCoverPhotoExample />);
    await page.getByRole("radio", { name: "Clear" }).click();
    await expect.element(value()).toMatchTextContent('"photoClear":true');
  });

  it("picks a style", async () => {
    await render(<StylePickerExample />);
    await page.getByRole("radio", { name: THEMES[1].label }).click();
    await expect.element(value()).toHaveTextContent(`Value: "${THEMES[1].id}"`);
  });

  it("saves, opens and starts a project again from the menu", async () => {
    // Room above it, since the menu opens upwards.
    const { container } = await render(
      <div style={{ paddingTop: 200 }}>
        <ProjectMenuExample />
      </div>,
    );
    const more = page.getByRole("button", { name: "More options" });
    await more.click();
    await page.getByRole("button", { name: "Save project file" }).click();
    await expect.element(log().nth(0)).toHaveTextContent("onSave()");
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const files = new DataTransfer();
    files.items.add(new File(["{}"], "example.json"));
    input.files = files.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await expect.element(log().nth(1)).toHaveTextContent("onOpen(File example.json)");
    await more.click();
    await page.getByRole("button", { name: "Start again" }).click();
    await expect.element(log().nth(2)).toHaveTextContent("onReset()");
  });

  it("disables Save in a pack's menu", async () => {
    await render(
      <div style={{ paddingTop: 200 }}>
        <ProjectMenuSaveDisabledExample />
      </div>,
    );
    await page.getByRole("button", { name: "More options" }).click();
    await expect.element(page.getByRole("button", { name: "Save pack file" })).toBeDisabled();
  });

  it("changes a new design's layout and adds a QR code", async () => {
    await render(<DesignControlsNewExample />);
    await page.getByRole("radio", { name: /Quote/ }).click();
    await expect.element(value()).toMatchTextContent('"templateId":"quote"');
    await page.getByRole("button", { name: "Add a QR code" }).click();
    await expect.element(log().nth(0)).toHaveTextContent("onQrAdded()");
  });

  it("fills a design in from an event", async () => {
    await render(<DesignControlsEventExample />);
    await page.getByLabelText("Start from one of our events").selectOptions("evt123");
    // The design's value comes last, after those of the extras inside it.
    await expect.element(value().last()).toMatchTextContent("Letter writing");
    await expect.element(log().nth(0)).toMatchTextContent(/^onMessage\("Filled in from/);
  });
});

describe("the collateral kit's examples", () => {
  it("picks a choice", async () => {
    await render(<RadioChoicesExample />);
    await page.getByRole("radio", { name: /Option two/ }).click();
    await expect.element(value()).toHaveTextContent('Value: "two"');
  });

  it("ticks and unticks checkbox choices", async () => {
    await render(<CheckboxChoicesExample />);
    await page.getByRole("checkbox", { name: /Option two/ }).click();
    await page.getByRole("checkbox", { name: /Option one/ }).click();
    await expect.element(value()).toHaveTextContent('Value: ["two"]');
  });

  it("picks a library photo", async () => {
    await render(<PhotoLibraryExample />);
    await page.getByRole("button", { name: LIBRARY_PHOTOS[1].label }).click();
    await expect.element(value()).toHaveTextContent(`Value: "${LIBRARY_PHOTOS[1].id}"`);
  });

  it("downloads, unless disabled", async () => {
    await render(<DownloadButtonExample />);
    await expect.element(page.getByRole("button", { name: "Download PDF" })).toBeDisabled();
    await page.getByRole("button", { name: "Download PNG" }).click();
    await expect.element(log().nth(0)).toMatchTextContent(/^onClick\(/);
  });

  it("draws the preview, which takes pointer gestures", async () => {
    await render(<PreviewCanvasReadyExample />);
    const canvas = page.getByRole("img", { name: "An example preview" });
    await expect.element(canvas).toBeVisible();
    for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel"]) {
      canvas.element().dispatchEvent(new PointerEvent(type, { bubbles: true }));
    }
    expect((canvas.element() as HTMLCanvasElement).width).toBe(400);
  });
});
