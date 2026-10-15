import { afterEach, describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import {
  canvasToPngBlob,
  downloadCanvasPdf,
  downloadCanvasPng,
  downloadFilesZip,
  downloadPlatformBundleZip,
  downloadText,
  exportFilename,
  pdfBytesDigital,
  pdfBytesForPrint,
} from "./export";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function canvas(w = 40, h = 20) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.fillRect(0, 0, w, h);
  return c;
}

/** Catches the next download: the file name and the blob behind its object URL. */
function catchDownloads() {
  const blobs = new Map<string, Blob>();
  const got: { name: string; blob: Blob }[] = [];
  vi.spyOn(URL, "createObjectURL").mockImplementation((b) => {
    const url = `blob:test/${blobs.size}`;
    blobs.set(url, b as Blob);
    return url;
  });
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    got.push({ name: this.download, blob: blobs.get(this.getAttribute("href")!)! });
    expect(document.body.contains(this)).toBe(true);
  });
  return { got, revoke };
}

describe("file names", () => {
  it("prefixes and joins the parts", () => {
    expect(exportFilename(["event", "a5"], "pdf")).toBe("pauseai-event-a5.pdf");
  });
});

describe("downloads", () => {
  it("downloads text, then frees the object URL", async () => {
    vi.useFakeTimers();
    const { got, revoke } = catchDownloads();
    downloadText("{}", "project.json", "application/json");
    expect(got[0].name).toBe("project.json");
    expect(await got[0].blob.text()).toBe("{}");
    expect(got[0].blob.type).toBe("application/json");
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revoke).toHaveBeenCalledWith("blob:test/0");
    expect(document.querySelector("a[download]")).toBeNull();
  });

  it("downloads a canvas as a PNG", async () => {
    const { got } = catchDownloads();
    await downloadCanvasPng(canvas(), "x.png");
    expect(got[0].name).toBe("x.png");
    expect(got[0].blob.type).toBe("image/png");
  });

  it("reports a canvas that can't be encoded", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb) => cb(null));
    await expect(downloadCanvasPng(canvas(), "x.png")).rejects.toThrow("Could not create the image");
    await expect(canvasToPngBlob(canvas())).rejects.toThrow("Could not create the image");
  });

  it("encodes a canvas as a PNG blob", async () => {
    const blob = await canvasToPngBlob(canvas());
    expect(blob.type).toBe("image/png");
  });
});

describe("PDFs", () => {
  it("builds a print PDF at trim size plus bleed, one page per canvas, with the trim and bleed boxes set", async () => {
    const bytes = await pdfBytesForPrint([canvas(), canvas()], { widthMm: 148, heightMm: 210 }, 3);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(2);
    const page = pdf.getPage(0);
    const mm = 72 / 25.4;
    expect(page.getWidth()).toBeCloseTo((148 + 6) * mm, 3);
    expect(page.getHeight()).toBeCloseTo((210 + 6) * mm, 3);
    expect(page.getTrimBox()).toMatchObject({ x: expect.closeTo(3 * mm, 3), width: expect.closeTo(148 * mm, 3) });
    expect(page.getBleedBox()).toMatchObject({ x: 0, y: 0 });
    expect(pdf.getTitle()).toBe("PauseAI UK collateral");
  });

  it("builds a screen PDF at 1px to 1pt", async () => {
    const pdf = await PDFDocument.load(await pdfBytesDigital([canvas(300, 200)]));
    expect(pdf.getPage(0).getSize()).toEqual({ width: 300, height: 200 });
  });

  it("downloads a one-page print PDF", async () => {
    const { got } = catchDownloads();
    await downloadCanvasPdf(canvas(), { widthMm: 105, heightMm: 148 }, 3, "flyer.pdf");
    expect(got[0].name).toBe("flyer.pdf");
    expect(got[0].blob.type).toBe("application/pdf");
    expect((await PDFDocument.load(await got[0].blob.arrayBuffer())).getPageCount()).toBe(1);
  });
});

describe("zips", () => {
  it("zips named files into one download", async () => {
    const { got } = catchDownloads();
    await downloadFilesZip(
      [
        { name: "a.txt", data: new Blob(["A"]) },
        { name: "b.bin", data: new Uint8Array([1, 2]) },
      ],
      "pack.zip",
    );
    const zip = await JSZip.loadAsync(await got[0].blob.arrayBuffer());
    expect(Object.keys(zip.files).sort()).toEqual(["a.txt", "b.bin"]);
    expect(await zip.file("a.txt")!.async("string")).toBe("A");
  });

  it("puts each platform's images or PDF in its own folder", async () => {
    const { got } = catchDownloads();
    await downloadPlatformBundleZip(
      [
        { folder: "instagram", kind: "images", pngBlobs: [new Blob(["1"]), new Blob(["2"])] },
        { folder: "linkedin", kind: "pdf", pdfBytes: new Uint8Array([37, 80, 68, 70]), pdfName: "carousel.pdf" },
      ],
      "carousel.zip",
    );
    expect(got[0].name).toBe("carousel.zip");
    const zip = await JSZip.loadAsync(await got[0].blob.arrayBuffer());
    expect(
      Object.keys(zip.files)
        .filter((f) => !f.endsWith("/"))
        .sort(),
    ).toEqual(["instagram/1.png", "instagram/2.png", "linkedin/carousel.pdf"]);
  });
});
