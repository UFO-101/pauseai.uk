import { qrMatrix } from "@/lib/collateral/qr";

/**
 * A canvas with a plain black-on-white QR code for `text`, `size` pixels
 * square, drawn at (x, y) on a white canvas `canvasSize` square. For feeding
 * the QR scanner a photo or a camera frame it can read.
 */
export function qrCanvas(
  text: string,
  { size = 300, canvasSize, x = 40, y = 40 }: { size?: number; canvasSize?: number; x?: number; y?: number } = {},
): HTMLCanvasElement {
  canvasSize ??= size + 80;
  const matrix = qrMatrix(text);
  const canvas = document.createElement("canvas");
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvasSize, canvasSize);
  const cell = size / matrix.length;
  ctx.fillStyle = "#000";
  matrix.forEach((row, r) =>
    row.forEach((dark, c) => dark && ctx.fillRect(x + c * cell, y + r * cell, Math.ceil(cell), Math.ceil(cell))),
  );
  return canvas;
}

/** A canvas as a PNG file, as if chosen from the photo picker. */
export function canvasFile(canvas: HTMLCanvasElement, name = "photo.png"): Promise<File> {
  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(new File([blob!], name, { type: "image/png" })), "image/png"),
  );
}
