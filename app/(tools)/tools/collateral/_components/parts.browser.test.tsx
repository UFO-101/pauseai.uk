import { afterEach, describe, expect, it, vi } from "vitest";
import { render, renderHook } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { useRef, useState } from "react";
import { getFormat } from "@/lib/collateral/formats";
import { LIBRARY_PHOTOS } from "@/lib/collateral/photos";
import type { PhotoView } from "@/lib/collateral/photoTransform";
import type { DesignData } from "@/lib/collateral/project";
import * as render_ from "@/lib/collateral/render";
import { LOGO_COVER_TITLE_CHARS, defaultValues, getTemplate } from "@/lib/collateral/templates";
import { THEMES } from "@/lib/collateral/themes";
import CharCount from "./CharCount";
import Checks from "./Checks";
import CropControls from "./CropControls";
import {
  DESIGN_TEMPLATES,
  designFromData,
  designQrCodes,
  designTemplate,
  designToData,
  designValues,
  newDesign,
  withQrCodes,
  type DesignState,
} from "./designState";
import LogoCoverControls from "./LogoCoverControls";
import ProjectMenu from "./ProjectMenu";
import QrFormatNote from "./QrFormatNote";
import StylePicker from "./StylePicker";
import TitleSizeControl from "./TitleSizeControl";
import { usePhotoGestures } from "./usePhotoGestures";
import { useStudioAssets } from "./useStudioAssets";

afterEach(() => vi.restoreAllMocks());

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("designState", () => {
  it("offers every layout but the hidden ones, with Event last", () => {
    expect(DESIGN_TEMPLATES.map((t) => t.id)).toEqual(["announcement", "quote", "event"]);
  });

  it("starts a design on the default layout and style", () => {
    const d = newDesign();
    expect(designTemplate(d).id).toBe("announcement");
    expect(designValues(d)).toEqual(defaultValues(getTemplate("announcement")));
    expect(designQrCodes(d)).toEqual([]);
  });

  it("falls back to the default layout for a hidden one, and fills in new fields' defaults", () => {
    const d = { ...newDesign("brush"), valuesByTemplate: { announcement: { headline: "Mine" } } };
    expect(designTemplate(d).id).toBe("announcement");
    expect(designValues(d).headline).toBe("Mine");
    expect(designValues(d).cta).toBe(defaultValues(getTemplate("announcement")).cta);
  });

  it("keeps QR codes per layout", () => {
    const d = withQrCodes(newDesign("event"), [{ label: "RSVP", url: "x" }]);
    expect(designQrCodes(d)).toEqual([{ label: "RSVP", url: "x" }]);
    expect(designQrCodes({ ...d, templateId: "quote" })).toEqual([]);
  });

  it("saves library photos by id, and uploads only when asked", async () => {
    const drawable = await render_.loadDataUrl(PNG);
    const library: DesignState = { ...newDesign(), photo: { drawable, name: "x", source: { kind: "library", id: LIBRARY_PHOTOS[0].id } } };
    expect(designToData(library, false).photo).toEqual({ kind: "library", id: LIBRARY_PHOTOS[0].id });
    const upload: DesignState = { ...newDesign(), photo: { drawable, name: "mine.png", source: { kind: "upload" } } };
    expect(designToData(upload, false).photo).toBeNull();
    expect(designToData(upload, true).photo).toMatchObject({ kind: "upload", name: "mine.png", dataUrl: expect.stringMatching(/^data:image\/jpeg/) });
    expect(designToData(newDesign(), true).photo).toBeNull();
  });

  it("loads a saved design's photo and partner logos, saying when one fails", async () => {
    const base = designToData(newDesign(), false);
    const ok = await designFromData({ ...base, photo: { kind: "library", id: LIBRARY_PHOTOS[0].id }, partnerLogos: [{ name: "p", dataUrl: PNG }] });
    expect(ok.ok).toBe(true);
    expect(ok.design.photo?.name).toBe(LIBRARY_PHOTOS[0].label);
    expect(ok.design.partnerLogos).toHaveLength(1);
    const upload = await designFromData({ ...base, photo: { kind: "upload", name: "u", dataUrl: PNG } });
    expect(upload.design.photo).toMatchObject({ name: "u", source: { kind: "upload" } });
    const broken: DesignData = { ...base, photo: { kind: "upload", name: "u", dataUrl: "data:image/png;base64,AAAA" }, partnerLogos: [{ name: "p", dataUrl: "data:image/png;base64,AAAA" }] };
    const failed = await designFromData(broken);
    expect(failed.ok).toBe(false);
    expect(failed.design.photo).toBeNull();
    expect(failed.design.partnerLogos).toEqual([]);
    expect((await designFromData(base)).ok).toBe(true);
  });
});

describe("small controls", () => {
  it("counts characters once a field is nearly full", async () => {
    const { container, rerender } = await render(<CharCount value="abc" max={10} />);
    expect(container.textContent).toBe("");
    await rerender(<CharCount value="abcdefgh" max={10} />);
    expect(container.querySelector(".collateral-count")?.className).toBe("collateral-count");
    await rerender(<CharCount value="abcdefghij" max={10} />);
    expect(container.querySelector(".collateral-count")?.className).toBe("collateral-count is-full");
    await rerender(<CharCount value="abcdefghij" />);
    expect(container.textContent).toBe("");
  });

  it("lists checks, warnings and notes marked, or says there are none", async () => {
    const { container, rerender } = await render(<Checks issues={[]} />);
    expect(container.textContent).toBe("Checks✓ No problems found.");
    await rerender(<Checks title="For all" issues={[{ id: "a", level: "warn", message: "Bad" }, { id: "b", level: "info", message: "Hmm" }]} />);
    expect([...container.querySelectorAll("li")].map((li) => li.textContent)).toEqual(["⚠ Bad", "ℹ Hmm"]);
    expect(container.querySelector("strong")?.textContent).toBe("For all");
  });

  it("adjusts the crop with sliders", async () => {
    const onChange = vi.fn();
    const { container } = await render(<CropControls view={{ zoom: 1, focalX: 0.5, focalY: 0.5 }} onChange={onChange} />);
    container.querySelector("details")!.open = true;
    const sliders = container.querySelectorAll<HTMLInputElement>('input[type="range"]');
    const set = (el: HTMLInputElement, v: string) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    set(sliders[0], "2");
    set(sliders[1], "0.2");
    set(sliders[2], "0.8");
    expect(onChange.mock.calls).toEqual([[{ zoom: 2 }], [{ focalX: 0.2 }], [{ focalY: 0.8 }]]);
  });

  it("picks a style", async () => {
    const onTheme = vi.fn();
    await render(<StylePicker themeId={THEMES[0].id} onTheme={onTheme} />);
    await expect.element(page.getByRole("radio", { name: THEMES[0].label })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("radio", { name: THEMES[1].label }).click();
    expect(onTheme).toHaveBeenCalledWith(THEMES[1].id);
  });

  it("nudges the title size, opening itself when it's flagged or changed", async () => {
    const onChange = vi.fn();
    const { container, rerender } = await render(<TitleSizeControl value={1} onChange={onChange} flagged={false} />);
    expect(container.querySelector("details")!.open).toBe(false);
    expect(container.textContent).toContain("Automatic");
    await rerender(<TitleSizeControl value={1} onChange={onChange} flagged />);
    expect(container.querySelector("details")!.open).toBe(true);
    await page.getByRole("button", { name: "Bigger title" }).click();
    await page.getByRole("button", { name: "Smaller title" }).click();
    expect(onChange.mock.calls.map(([v]) => Math.round(v * 10) / 10)).toEqual([1.1, 0.9]);
    await rerender(<TitleSizeControl value={1.3} onChange={onChange} flagged={false} />);
    expect(container.textContent).toContain("130%");
    await expect.element(page.getByRole("button", { name: "Bigger title" })).toBeDisabled();
    await page.getByRole("button", { name: "Back to automatic" }).click();
    expect(onChange).toHaveBeenLastCalledWith(1);
    await rerender(<TitleSizeControl value={0.7} onChange={onChange} flagged={false} />);
    await expect.element(page.getByRole("button", { name: "Smaller title" })).toBeDisabled();
  });

  it("explains QR codes on each kind of format", async () => {
    const onScreenQr = vi.fn();
    const { container, rerender } = await render(<QrFormatNote format={getFormat("luma-cover")} screenQr={false} onScreenQr={onScreenQr} />);
    expect(container.textContent).toContain("left off the Luma event cover");
    await rerender(<QrFormatNote format={getFormat("ig-square")} screenQr={false} onScreenQr={onScreenQr} reason="Trimmed" />);
    expect(container.textContent).toContain("left off social posts by default");
    await page.getByRole("checkbox").click();
    expect(onScreenQr).toHaveBeenCalledWith(true);
    await rerender(<QrFormatNote format={getFormat("ig-square")} screenQr onScreenQr={onScreenQr} reason="Trimmed" />);
    expect(container.querySelector(".collateral-hint")?.textContent).toBe("Trimmed");
    await rerender(<QrFormatNote format={getFormat("ig-square")} screenQr onScreenQr={onScreenQr} />);
    expect(container.querySelector(".collateral-hint")).toBeNull();
    await rerender(<QrFormatNote format={getFormat("a5")} screenQr={false} onScreenQr={onScreenQr} reason="Trimmed" />);
    expect(container.textContent).toBe("Trimmed");
    await rerender(<QrFormatNote format={getFormat("a5")} screenQr={false} onScreenQr={onScreenQr} />);
    expect(container.textContent).toBe("");
  });

  it("sets the Luma cover's title and photo options", async () => {
    let design: DesignState = newDesign();
    const update = (fn: (d: DesignState) => DesignState) => (design = fn(design));
    const drawable = await render_.loadDataUrl(PNG);
    const { container, rerender } = await render(<LogoCoverControls design={design} update={update} />);
    expect(container.textContent).toContain(`${LOGO_COVER_TITLE_CHARS} characters`);
    expect(container.querySelector('[role="radiogroup"]')).toBeNull();
    await page.getByRole("checkbox").click();
    expect(design.coverTitle).toBe(false);
    design = { ...design, photo: { drawable, name: "p", source: { kind: "upload" } } };
    await rerender(<LogoCoverControls design={design} update={update} />);
    expect(container.textContent).not.toContain("characters");
    await page.getByRole("radio", { name: "Clear" }).click();
    expect(design.photoClear).toBe(true);
    await page.getByRole("radio", { name: "Tinted" }).click();
    expect(design.photoClear).toBe(false);
  });
});

describe("ProjectMenu", () => {
  it("saves, opens and starts again from a small menu that closes itself", async () => {
    const onSave = vi.fn();
    const onOpen = vi.fn();
    const onReset = vi.fn();
    const { container } = await render(
      <>
        <p>outside</p>
        <ProjectMenu noun="pack" onSave={onSave} onOpen={onOpen} onReset={onReset} />
      </>,
    );
    const toggle = page.getByRole("button", { name: "More options" });
    await toggle.click();
    await page.getByRole("button", { name: "Save pack file" }).click();
    expect(onSave).toHaveBeenCalled();
    await expect.element(page.getByRole("button", { name: "Start again" })).not.toBeInTheDocument();
    await toggle.click();
    await page.getByRole("button", { name: "Start again" }).click();
    expect(onReset).toHaveBeenCalled();

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const click = vi.spyOn(input, "click").mockImplementation(() => {});
    await toggle.click();
    await page.getByRole("button", { name: "Open pack file" }).click();
    expect(click).toHaveBeenCalled();
    const list = new DataTransfer();
    list.items.add(new File(["{}"], "pack.json"));
    input.files = list.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(onOpen.mock.lastCall![0].name).toBe("pack.json");
    input.files = new DataTransfer().files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(onOpen).toHaveBeenLastCalledWith(undefined);

    // A click inside keeps it open; outside or Escape closes it.
    await toggle.click();
    container.querySelector(".collateral-menu-list")!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await expect.element(page.getByRole("button", { name: "Start again" })).toBeVisible();
    await page.getByText("outside").click();
    await expect.element(page.getByRole("button", { name: "Start again" })).not.toBeInTheDocument();
    await toggle.click();
    await userEvent.keyboard("x");
    await expect.element(page.getByRole("button", { name: "Start again" })).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect.element(page.getByRole("button", { name: "Start again" })).not.toBeInTheDocument();
  });

  it("can't save before there's anything to save", async () => {
    await render(<ProjectMenu noun="project" onSave={vi.fn()} onOpen={vi.fn()} onReset={vi.fn()} saveDisabled />);
    await page.getByRole("button", { name: "More options" }).click();
    await expect.element(page.getByRole("button", { name: "Save project file" })).toBeDisabled();
  });
});

describe("useStudioAssets", () => {
  it("loads the fonts and every style's logo", async () => {
    const { result } = await renderHook(() => useStudioAssets());
    await expect.poll(() => result.current.fontsReady).toBe(true);
    await expect.poll(() => Object.keys(result.current.logos).length).toBe(new Set(THEMES.map((t) => t.logoSrc)).size);
    expect(result.current.error).toBeNull();
  });

});

describe("usePhotoGestures", () => {
  function Harness({ withPhoto = true, onView }: { withPhoto?: boolean; onView: (v: PhotoView) => void }) {
    const ref = useRef<HTMLCanvasElement>(null);
    const [view, setView] = useState<PhotoView>({ zoom: 1, focalX: 0.5, focalY: 0.5 });
    const photo = withPhoto ? { source: document.createElement("canvas"), width: 2000, height: 1000 } : null;
    const gestures = usePhotoGestures(ref, photo, view, (fn) =>
      setView((v) => {
        const next = fn(v);
        onView(next);
        return next;
      }),
    );
    return <canvas ref={ref} width={400} height={400} style={{ width: 200, height: 200 }} data-testid="c" {...gestures} />;
  }

  const pointer = (el: Element, type: string, id: number, x: number, y: number) =>
    el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: id, clientX: x, clientY: y }));

  it("drags the photo, pinches and scrolls to zoom", async () => {
    const onView = vi.fn();
    await render(<Harness onView={onView} />);
    const c = page.getByTestId("c").element();
    vi.spyOn(c, "setPointerCapture").mockImplementation(() => {});
    const r = c.getBoundingClientRect();

    pointer(c, "pointerdown", 1, r.left + 100, r.top + 100);
    pointer(c, "pointermove", 1, r.left + 80, r.top + 100);
    await expect.poll(() => onView.mock.lastCall?.[0].focalX).toBeGreaterThan(0.5);

    // A second finger pinches.
    pointer(c, "pointerdown", 2, r.left + 150, r.top + 100);
    pointer(c, "pointermove", 2, r.left + 190, r.top + 100);
    await expect.poll(() => onView.mock.lastCall?.[0].zoom).toBeGreaterThan(1);
    pointer(c, "pointerup", 2, 0, 0);
    pointer(c, "pointercancel", 1, 0, 0);
    // A move from a pointer that isn't down does nothing.
    const calls = onView.mock.calls.length;
    pointer(c, "pointermove", 3, 0, 0);
    expect(onView.mock.calls.length).toBe(calls);

    c.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -100, clientX: r.left + 100, clientY: r.top + 100 }));
    c.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 3, deltaMode: 1, ctrlKey: true }));
    await expect.poll(() => onView.mock.calls.length).toBeGreaterThan(calls + 1);
  });

  it("copes with two fingers in the same place", async () => {
    const onView = vi.fn();
    await render(<Harness onView={onView} />);
    const c = page.getByTestId("c").element();
    vi.spyOn(c, "setPointerCapture").mockImplementation(() => {});
    pointer(c, "pointerdown", 1, 50, 50);
    pointer(c, "pointerdown", 2, 50, 50);
    pointer(c, "pointermove", 2, 60, 50);
    await expect.poll(() => onView.mock.calls.length).toBeGreaterThan(0);
    pointer(c, "pointerdown", 3, 70, 70);
    pointer(c, "pointermove", 3, 80, 80);
  });

  it("does nothing without a photo", async () => {
    const onView = vi.fn();
    await render(<Harness withPhoto={false} onView={onView} />);
    const c = page.getByTestId("c").element();
    pointer(c, "pointerdown", 1, 10, 10);
    pointer(c, "pointermove", 1, 20, 20);
    c.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: 10 }));
    expect(onView).not.toHaveBeenCalled();
  });
});
