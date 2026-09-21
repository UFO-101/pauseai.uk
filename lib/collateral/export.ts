function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(text: string, filename: string, mime: string) {
  download(new Blob([text], { type: mime }), filename);
}

export function exportFilename(parts: string[], ext: string): string {
  return `pauseai-${parts.join("-")}.${ext}`;
}

const MM_TO_PT = 72 / 25.4;

function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? blob.arrayBuffer().then(resolve, reject) : reject(new Error("Could not create the image"))), "image/png");
  });
}

/** One-page PDF at trim size plus bleed, with TrimBox/BleedBox set so print shops can find the trim. */
export async function downloadCanvasPdf(
  canvas: HTMLCanvasElement,
  format: { widthMm: number; heightMm: number },
  bleedMm: number,
  filename: string,
): Promise<void> {
  // Loaded on demand so the editor page stays light.
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const bleed = bleedMm * MM_TO_PT;
  const trimW = format.widthMm * MM_TO_PT;
  const trimH = format.heightMm * MM_TO_PT;
  const pageW = trimW + bleed * 2;
  const pageH = trimH + bleed * 2;
  const page = pdf.addPage([pageW, pageH]);
  const image = await pdf.embedPng(await canvasToPngBytes(canvas));
  page.drawImage(image, { x: 0, y: 0, width: pageW, height: pageH });
  page.setTrimBox(bleed, bleed, trimW, trimH);
  page.setBleedBox(0, 0, pageW, pageH);
  pdf.setTitle("PauseAI UK collateral");
  const bytes = await pdf.save();
  download(new Blob([bytes as BlobPart], { type: "application/pdf" }), filename);
}

export function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Could not create the image"));
      download(blob, filename);
      resolve();
    }, "image/png");
  });
}
