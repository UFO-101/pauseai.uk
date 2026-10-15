import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { canvasFile, qrCanvas } from "@/tests/browser/qr-images";
import QrScanner from "./QrScanner";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function choose(container: HTMLElement, file: File | null) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  const list = new DataTransfer();
  if (file) list.items.add(file);
  input.files = list.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

const dialog = (container: HTMLElement) => container.querySelector("dialog") as HTMLDialogElement;

describe("reading a photo", () => {
  it("finds a code in a photo by itself", async () => {
    const onResult = vi.fn();
    const { container } = await render(<QrScanner onResult={onResult} />);
    await choose(container, await canvasFile(qrCanvas("https://pauseai.uk/join")));
    await expect.poll(() => onResult.mock.calls[0]?.[0]).toBe("https://pauseai.uk/join");
    expect(dialog(container).open).toBe(false);
  });

  it("finds a code that is small in a big photo by searching parts of it", async () => {
    const onResult = vi.fn();
    const { container } = await render(<QrScanner onResult={onResult} />);
    await choose(container, await canvasFile(qrCanvas("small", { size: 160, canvasSize: 2400, x: 1900, y: 1900 })));
    await expect.poll(() => onResult.mock.calls[0]?.[0], { timeout: 10000 }).toBe("small");
  });

  it("tries every part of a photo with no code before asking for a box", async () => {
    const blank = document.createElement("canvas");
    blank.width = blank.height = 120;
    const { container } = await render(<QrScanner onResult={vi.fn()} />);
    await choose(container, await canvasFile(blank));
    await expect.poll(() => container.querySelector("h2")?.textContent, { timeout: 10000 }).toBe("Find the QR code");
  });

  it("opens the photo picker", async () => {
    const { container } = await render(<QrScanner onResult={vi.fn()} />);
    const click = vi
      .spyOn(container.querySelector('input[type="file"]') as HTMLInputElement, "click")
      .mockImplementation(() => {});
    await page.getByRole("button", { name: "Use a photo" }).click();
    expect(click).toHaveBeenCalled();
  });

  it("does nothing when the picker is cancelled", async () => {
    const onResult = vi.fn();
    const { container } = await render(<QrScanner onResult={onResult} />);
    await choose(container, null);
    expect(dialog(container).open).toBe(false);
  });

  it("says when the file isn't an image", async () => {
    const { container } = await render(<QrScanner onResult={vi.fn()} />);
    await choose(container, new File(["not an image"], "x.png", { type: "image/png" }));
    await expect.element(page.getByText("Could not read that image. Try a different photo.")).toBeVisible();
  });

  it("asks for a box round the code when it can't find one, and reads what's in the box", async () => {
    // Make the automatic search give up after its first try.
    let now = 0;
    vi.spyOn(Date, "now").mockImplementation(() => (now += 5000));
    const onResult = vi.fn();
    const { container } = await render(<QrScanner onResult={onResult} />);
    // 4px a module, but tiny once the whole 3000px photo is shrunk to 800px for the first try.
    await choose(container, await canvasFile(qrCanvas("boxed", { size: 84, canvasSize: 3000, x: 2860, y: 2860 })));
    await expect
      .poll(() => [dialog(container).open, onResult.mock.calls.length, container.querySelector("h2")?.textContent])
      .toEqual([true, 0, "Find the QR code"]);
    vi.mocked(Date.now).mockRestore();

    const crop = container.querySelector(".collateral-qr-crop") as HTMLElement;
    const img = crop.querySelector("img") as HTMLImageElement;
    await expect.poll(() => img.complete && img.naturalWidth > 0).toBe(true);
    // Measured each time: the dialog's layout shifts as messages come and go.
    const at = (fx: number, fy: number) => {
      const r = img.getBoundingClientRect();
      return { clientX: r.left + fx * r.width, clientY: r.top + fy * r.height };
    };
    // Each event gets a turn of the event loop, as a real drag would, so React renders in between.
    const pointer = async (type: string, fx: number, fy: number) => {
      crop.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, ...at(fx, fy) }));
      await new Promise((r) => setTimeout(r, 0));
    };
    vi.spyOn(crop, "setPointerCapture").mockImplementation(() => {});

    // A box with nothing in it.
    await pointer("pointerdown", 0.05, 0.05);
    await pointer("pointermove", 0.3, 0.3);
    await expect.poll(() => container.querySelector(".collateral-qr-crop-box")).not.toBeNull();
    await pointer("pointerup", 0.3, 0.3);
    await expect.element(page.getByText(/No code in that box/)).toBeVisible();

    // A tiny box is treated as a stray tap.
    await pointer("pointerdown", 0.5, 0.5);
    await pointer("pointerup", 0.5, 0.5);
    await expect.poll(() => container.querySelector(".collateral-qr-crop-box")).toBeNull();

    // A cancelled drag clears the box; a release that didn't start on the photo does nothing.
    await pointer("pointerdown", 0.1, 0.1);
    await pointer("pointercancel", 0.1, 0.1);
    await expect.poll(() => container.querySelector(".collateral-qr-crop-box")).toBeNull();
    await pointer("pointermove", 0.2, 0.2);
    await pointer("pointerup", 0.2, 0.2);

    // A box round the code (dragged up and left, past the edge).
    await pointer("pointerdown", 0.995, 0.995);
    await pointer("pointermove", 0.94, 0.94);
    await pointer("pointerup", 0.94, 0.94);
    await expect.poll(() => onResult.mock.calls[0]?.[0]).toBe("boxed");
    await expect.poll(() => dialog(container).open).toBe(false);
  });

  it("closes the photo with Cancel or Escape", async () => {
    let now = 0;
    vi.spyOn(Date, "now").mockImplementation(() => (now += 5000));
    const { container } = await render(<QrScanner onResult={vi.fn()} />);
    const blank = document.createElement("canvas");
    blank.width = blank.height = 200;
    await choose(container, await canvasFile(blank));
    await expect.poll(() => dialog(container).open).toBe(true);
    await page.getByRole("button", { name: "Cancel" }).click();
    expect(dialog(container).open).toBe(false);
    await choose(container, await canvasFile(blank));
    await expect.poll(() => dialog(container).open).toBe(true);
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => dialog(container).open).toBe(false);
  });
});

describe("the camera", () => {
  /** A fake camera showing `canvas`. */
  function camera(canvas: HTMLCanvasElement) {
    const stream = canvas.captureStream(30);
    // Keep the stream producing frames.
    const ctx = canvas.getContext("2d")!;
    const tick = setInterval(() => ctx.fillRect(0, 0, 1, 1), 50);
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    vi.stubGlobal("navigator", { ...navigator, mediaDevices: { getUserMedia } });
    return { stream, getUserMedia, stop: () => clearInterval(tick) };
  }

  it("reads a code held up to the camera", async () => {
    const cam = camera(qrCanvas("from the camera"));
    const onResult = vi.fn();
    await render(<QrScanner onResult={onResult} />);
    await page.getByRole("button", { name: "Scan an existing code" }).click();
    // No check for the scanner's heading first: a quick read closes the scanner before the check can see it.
    await expect.poll(() => onResult.mock.calls[0]?.[0], { timeout: 10000 }).toBe("from the camera");
    expect(cam.getUserMedia).toHaveBeenCalledWith({ video: { facingMode: "environment" }, audio: false });
    cam.stop();
  });

  it("keeps looking while there's no code in view, and stops the camera when closed", async () => {
    const blank = document.createElement("canvas");
    blank.width = blank.height = 200;
    const cam = camera(blank);
    const { container } = await render(<QrScanner onResult={vi.fn()} />);
    await page.getByRole("button", { name: "Scan an existing code" }).click();
    await expect
      .poll(() => (container.querySelector("video") as HTMLVideoElement | null)?.videoWidth)
      .toBeGreaterThan(0);
    await new Promise((r) => setTimeout(r, 400));
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect.poll(() => cam.stream.getTracks().every((t) => t.readyState === "ended")).toBe(true);
    cam.stop();
  });

  it("explains when the browser can't use the camera, offering a photo instead", async () => {
    vi.stubGlobal("navigator", { ...navigator, mediaDevices: undefined });
    const { container } = await render(<QrScanner onResult={vi.fn()} />);
    await page.getByRole("button", { name: "Scan an existing code" }).click();
    await expect.element(page.getByText(/This browser cannot use the camera here/)).toBeVisible();
    expect(container.querySelector("video")).toBeNull();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const click = vi.spyOn(input, "click").mockImplementation(() => {});
    await page.getByRole("button", { name: "Use a photo instead" }).click();
    expect(click).toHaveBeenCalled();
  });

  it("explains when camera access is blocked, or fails for another reason", async () => {
    for (const [error, text] of [
      [new DOMException("no", "NotAllowedError"), /Camera access was blocked/],
      [new DOMException("no", "SecurityError"), /Camera access was blocked/],
      [new DOMException("no", "NotFoundError"), /Could not start the camera/],
      [new Error("other"), /Could not start the camera/],
    ] as const) {
      vi.stubGlobal("navigator", { ...navigator, mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(error) } });
      const { unmount } = await render(<QrScanner onResult={vi.fn()} />);
      await page.getByRole("button", { name: "Scan an existing code" }).click();
      await expect.element(page.getByText(text)).toBeVisible();
      await unmount();
    }
  });

  it("stops quietly if closed before the camera starts, or fails after closing", async () => {
    let resolve: (s: MediaStream) => void = () => {};
    let reject: (e: Error) => void = () => {};
    const blank = document.createElement("canvas");
    const stream = blank.captureStream();
    vi.stubGlobal("navigator", {
      ...navigator,
      mediaDevices: {
        getUserMedia: vi
          .fn()
          .mockReturnValueOnce(new Promise((r) => (resolve = r)))
          .mockReturnValueOnce(new Promise((_, j) => (reject = j))),
      },
    });
    const { container } = await render(<QrScanner onResult={vi.fn()} />);
    await page.getByRole("button", { name: "Scan an existing code" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    resolve(stream);
    await page.getByRole("button", { name: "Scan an existing code" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    reject(new Error("late"));
    await new Promise((r) => setTimeout(r, 50));
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it("finds nothing if the canvas can't be read", async () => {
    const file = await canvasFile(qrCanvas("unreadable"));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    let now = 0;
    vi.spyOn(Date, "now").mockImplementation(() => (now += 5000));
    const onResult = vi.fn();
    const { container } = await render(<QrScanner onResult={onResult} />);
    await choose(container, file);
    await expect.poll(() => dialog(container).open).toBe(true);
    expect(onResult).not.toHaveBeenCalled();
  });
});
