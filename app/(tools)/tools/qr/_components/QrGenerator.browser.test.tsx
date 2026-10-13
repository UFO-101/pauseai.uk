import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import QrGenerator from "./QrGenerator";

// Downloads go through these; the tests check what would be saved.
const { downloads, fonts } = vi.hoisted(() => ({
  downloads: { text: vi.fn(), png: vi.fn() },
  fonts: { fail: false },
}));
vi.mock("@/lib/collateral/export", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/collateral/export")>();
  return {
    ...actual,
    downloadText: (...args: unknown[]) => downloads.text(...args),
    downloadCanvasPng: async (canvas: HTMLCanvasElement, name: string) => downloads.png(canvas, name),
  };
});
vi.mock("@/lib/collateral/qrCaption", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/collateral/qrCaption")>();
  return { ...actual, captionFontCss: () => (fonts.fail ? Promise.reject(new Error("offline")) : actual.captionFontCss()) };
});

beforeEach(() => {
  // No share sheet or clipboard images unless a test asks for one.
  vi.stubGlobal("navigator", { ...navigator, canShare: undefined });
  vi.stubGlobal("ClipboardItem", undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  downloads.text.mockReset();
  downloads.png.mockReset();
  fonts.fail = false;
});

const preview = (container: HTMLElement) => container.querySelector(".collateral-qr-image") as HTMLImageElement | null;
const input = (name: string) => page.getByLabelText(name, { exact: false });

describe("QrGenerator", () => {
  // First, while nothing has measured a caption yet in this file.
  it("measures captions roughly where the browser can't draw text", async () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { container } = await render(<QrGenerator />);
    await input("Label under the code").fill("Join");
    expect(preview(container)).not.toBeNull();
    getContext.mockRestore();
  });

  it("previews a code for pauseai.uk, with tips for printing it", async () => {
    const { container } = await render(<QrGenerator />);
    expect(preview(container)?.alt).toBe("QR code for https://pauseai.uk");
    await expect.element(page.getByRole("link", { name: "https://pauseai.uk" })).toHaveAttribute("href", "https://pauseai.uk");
    expect(container.querySelector(".collateral-tips")?.textContent).toMatch(/Print it at least \d+ mm wide/);
    expect(container.querySelector(".collateral-tips")?.textContent).not.toContain("dense code");
  });

  it("asks for a web address, and points out one that isn't", async () => {
    const { container } = await render(<QrGenerator />);
    await input("Web address").fill("");
    expect(container.querySelector(".collateral-loading")?.textContent).toBe("Type a web address to make a QR code.");
    await input("Web address").fill("not an address");
    expect(container.querySelector(".collateral-loading")?.textContent).toBe("Check the web address to see the code.");
    await expect.element(input("Web address")).toHaveAttribute("aria-invalid", "true");
    await expect.element(page.getByText(/That does not look like a web address/)).toBeVisible();
    await expect.element(page.getByRole("button", { name: "Download PNG" })).toBeDisabled();
  });

  it("warns about a dense code, and a caption too long to fit", async () => {
    const { container } = await render(<QrGenerator />);
    await input("Web address").fill(`pauseai.uk/${"a".repeat(150)}`);
    await input("Show the link under the code").click();
    await input("Label under the code").fill("A label that is far too long to fit under the code at all, really");
    const tips = () => container.querySelector(".collateral-tips")?.textContent ?? "";
    await expect.poll(tips).toContain("A shorter link scans more easily.");
    await expect.poll(tips).toContain("The text under the code is too long to fit.");
  });

  it("can leave out the pause symbol", async () => {
    const { container } = await render(<QrGenerator />);
    const before = preview(container)!.src;
    await input("Pause symbol in the middle").click();
    await expect.poll(() => preview(container)!.src).not.toBe(before);
  });

  it("downloads the code as an SVG, with the caption fonts inlined when there's a caption", async () => {
    await render(<QrGenerator />);
    await page.getByRole("button", { name: "Download SVG" }).click();
    expect(downloads.text).toHaveBeenLastCalledWith(expect.stringContaining("<svg"), "pauseai-qr-pauseai-uk.svg", "image/svg+xml");
    expect(downloads.text.mock.lastCall![0]).not.toContain("@font-face");
    await input("Label under the code").fill("Join us");
    await page.getByRole("button", { name: "Download SVG" }).click();
    await expect.poll(() => downloads.text.mock.calls.length).toBe(2);
    expect(downloads.text.mock.lastCall![0]).toContain("@font-face");
  });

  it("explains when the fonts for the caption can't load", async () => {
    fonts.fail = true;
    await render(<QrGenerator />);
    await input("Label under the code").fill("Join us");
    await page.getByRole("button", { name: "Download SVG" }).click();
    await expect.element(page.getByText("Could not load the fonts for the text. Check your connection and try again.")).toBeVisible();
  });

  it("downloads a 2048px PNG, taller with a caption", async () => {
    await render(<QrGenerator />);
    await page.getByRole("button", { name: "Download PNG" }).click();
    await expect.poll(() => downloads.png.mock.calls.length).toBe(1);
    const [canvas, name] = downloads.png.mock.lastCall!;
    expect([canvas.width, canvas.height, name]).toEqual([2048, 2048, "pauseai-qr-pauseai-uk.png"]);
    await input("Label under the code").fill("Join us");
    await page.getByRole("button", { name: "Download PNG" }).click();
    await expect.poll(() => downloads.png.mock.calls.length).toBe(2);
    expect(downloads.png.mock.lastCall![0].height).toBeGreaterThan(2048);
  });

  it("says 'Preparing…' while the PNG is made, and explains a failure", async () => {
    let finish: () => void = () => {};
    downloads.png.mockReturnValueOnce(new Promise<void>((r) => (finish = r)));
    await render(<QrGenerator />);
    await page.getByRole("button", { name: "Download PNG" }).click();
    await expect.element(page.getByRole("button", { name: "Preparing…" })).toBeDisabled();
    finish();
    await expect.element(page.getByRole("button", { name: "Download PNG" })).toBeEnabled();
    downloads.png.mockRejectedValueOnce(new Error("nope"));
    await page.getByRole("button", { name: "Download PNG" }).click();
    await expect.element(page.getByText("Could not create the PNG. Try the SVG instead.")).toBeVisible();
  });

  it("can't make a PNG where canvas isn't supported", async () => {
    await render(<QrGenerator />);
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    await page.getByRole("button", { name: "Download PNG" }).click();
    await expect.element(page.getByText("Could not create the PNG. Try the SVG instead.")).toBeVisible();
    getContext.mockRestore();
  });

  it("shares the PNG on phones, quietly when the share sheet is closed", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, canShare: () => true, share });
    await render(<QrGenerator />);
    await page.getByRole("button", { name: "Share" }).click();
    await expect.poll(() => share.mock.calls.length).toBe(1);
    expect(share.mock.lastCall![0].files[0].name).toBe("pauseai-qr-pauseai-uk.png");

    share.mockRejectedValueOnce(new DOMException("closed", "AbortError"));
    await page.getByRole("button", { name: "Share" }).click();
    await expect.poll(() => share.mock.calls.length).toBe(2);
    expect(document.querySelector(".collateral-message")).toBeNull();

    share.mockRejectedValueOnce(new Error("failed"));
    await page.getByRole("button", { name: "Share" }).click();
    await expect.element(page.getByText("Could not share the image. Download it instead.")).toBeVisible();
  });

  it("copies the PNG where the clipboard takes images", async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("navigator", { ...navigator, canShare: () => false, clipboard: { write: vi.fn().mockResolvedValue(undefined) } });
    await render(<QrGenerator />);
    await page.getByRole("button", { name: "Copy image" }).click();
    await expect.element(page.getByText("Copied. Paste it into your document or message.")).toBeVisible();
    (navigator.clipboard.write as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("denied"));
    await page.getByRole("button", { name: "Copy image" }).click();
    await expect.element(page.getByText("Could not copy the image. Download it instead.")).toBeVisible();
  });

  it("offers neither where the browser has no clipboard", async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("navigator", { ...navigator, canShare: undefined, clipboard: undefined });
    await render(<QrGenerator />);
    await expect.element(page.getByRole("button", { name: "Copy image" })).not.toBeInTheDocument();
    await expect.element(page.getByRole("button", { name: "Share" })).not.toBeInTheDocument();
  });

  it("uses a scanned web address, and shows what a scanned code says when it isn't one", async () => {
    const { container } = await render(<QrGenerator />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const scan = async (text: string) => {
      const { canvasFile, qrCanvas } = await import("@/tests/browser/qr-images");
      const list = new DataTransfer();
      list.items.add(await canvasFile(qrCanvas(text)));
      fileInput.files = list.files;
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    };
    await scan("hello there");
    await expect.element(page.getByText(/It says:/)).toBeVisible();
    expect(container.querySelector("q")?.textContent).toBe("hello there");
    await scan(" pauseai.uk/join ");
    await expect.element(input("Web address")).toHaveValue("pauseai.uk/join");
    expect(container.querySelector("q")).toBeNull();
    await scan("   ");
    await expect.poll(() => container.querySelector('.collateral-field-error[role="status"]')?.textContent).toBe("That code does not hold a web address.");
    await scan("x");
    await expect.element(page.getByText(/It says:/)).toBeVisible();
    await input("Web address").fill("pauseai.uk/a");
    expect(container.querySelector("q")).toBeNull();
  });

  it("renders on the server without the share or copy buttons, then adds them once hydrated", async () => {
    vi.stubGlobal("navigator", { ...navigator, canShare: () => true, share: vi.fn() });
    const { renderToString } = await import("react-dom/server");
    const { hydrateRoot } = await import("react-dom/client");
    const html = renderToString(<QrGenerator />);
    expect(html).not.toContain(">Share<");
    const host = document.createElement("div");
    host.innerHTML = html;
    document.body.appendChild(host);
    const root = hydrateRoot(host, <QrGenerator />);
    await expect.poll(() => host.textContent).toContain("Share");
    root.unmount();
    host.remove();
  });

  it("keeps the preview working if the caption fonts can't load, and stops loading them when the caption goes", async () => {
    fonts.fail = true;
    const { container } = await render(<QrGenerator />);
    await input("Label under the code").fill("x");
    await input("Label under the code").fill("");
    expect(preview(container)).not.toBeNull();
  });
});
