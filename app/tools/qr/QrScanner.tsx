"use client";

import { useEffect, useRef, useState } from "react";

/** Frames are shrunk to this width before decoding. Plenty for a code that fills part of the view, and quick on phones. */
const SCAN_WIDTH = 640;
/** Photos can be large, so they are shrunk too, but less, as the code may be small in the shot. */
const PHOTO_MAX = 1600;
/** Zoomed-in parts of a photo, and areas people draw round, are shrunk to at most this size. */
const REGION_MAX = 1000;
/** A second, smaller pass. The decoder often reads a blurry or dotted code better when it is smaller. */
const REGION_SMALL = 400;
/** Scaling small areas up helps the decoder a little, but much past 2x it starts to fail. */
const MAX_UPSCALE = 2;
/** How long to search a photo by itself before asking the person to draw a box round the code. */
const PHOTO_BUDGET_MS = 4000;
const SCAN_EVERY_MS = 150;
/** Boxes smaller than this share of the photo are treated as a stray tap. */
const MIN_BOX = 0.03;

type JsQr = typeof import("jsqr").default;

/** A part of an image, as fractions of its width and height. */
interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

const WHOLE: Region = { x: 0, y: 0, w: 1, h: 1 };

let jsQrPromise: Promise<JsQr> | null = null;
/** Loaded on first use so the decoder stays out of the page bundle for people who never scan. */
function loadJsQr(): Promise<JsQr> {
  jsQrPromise ??= import("jsqr").then((m) => m.default);
  return jsQrPromise;
}

interface DecodeOptions {
  /** Longest side, in pixels, the region is drawn at before decoding. Never more than MAX_UPSCALE times its real size. */
  size: number;
  /** Also try the inverted image, for light codes on dark backgrounds. Doubles the work. */
  thorough: boolean;
}

function decode(
  jsQr: JsQr,
  source: HTMLVideoElement | HTMLImageElement | ImageBitmap,
  sourceWidth: number,
  sourceHeight: number,
  region: Region,
  canvas: HTMLCanvasElement,
  { size, thorough }: DecodeOptions,
): string | null {
  const sx = region.x * sourceWidth;
  const sy = region.y * sourceHeight;
  const sw = region.w * sourceWidth;
  const sh = region.h * sourceHeight;
  const scale = Math.min(size / Math.max(sw, sh), MAX_UPSCALE);
  const width = Math.max(1, Math.round(sw * scale));
  const height = Math.max(1, Math.round(sh * scale));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  return jsQr(data, width, height, { inversionAttempts: thorough ? "attemptBoth" : "dontInvert" })?.data ?? null;
}

/** Overlapping tiles across the image, so a code that is small in the shot fills more of what the decoder sees. */
function tiles(perSide: number, tileSize: number): Region[] {
  const step = perSide > 1 ? (1 - tileSize) / (perSide - 1) : 0;
  const out: Region[] = [];
  for (let row = 0; row < perSide; row++) {
    for (let col = 0; col < perSide; col++) out.push({ x: col * step, y: row * step, w: tileSize, h: tileSize });
  }
  return out;
}

/** Grows a region on every side, kept inside the image. People tend to draw tight round a code and clip its edge. */
function pad(region: Region, amount: number): Region {
  const px = region.w * amount;
  const py = region.h * amount;
  const x = Math.max(0, region.x - px);
  const y = Math.max(0, region.y - py);
  return { x, y, w: Math.min(1, region.x + region.w + px) - x, h: Math.min(1, region.y + region.h + py) - y };
}

/**
 * Lets the browser paint between decodes, so the "Looking…" message shows and the page does not freeze.
 * Not requestAnimationFrame, which stops firing if the person switches tab while it runs.
 */
const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * The whole photo, then smaller and smaller zoomed-in parts of it. Gives up after PHOTO_BUDGET_MS, as a busy photo can
 * take the decoder a second or more per attempt on a phone.
 */
async function findInPhoto(jsQr: JsQr, bitmap: ImageBitmap): Promise<string | null> {
  const canvas = document.createElement("canvas");
  const deadline = Date.now() + PHOTO_BUDGET_MS;
  // The first pass is the biggest and slowest, so it skips the inverted image. The 800px pass covers that case.
  const attempts: [Region, DecodeOptions][] = [
    [WHOLE, { size: PHOTO_MAX, thorough: false }],
    [WHOLE, { size: 800, thorough: true }],
    ...tiles(2, 0.6).map((r): [Region, DecodeOptions] => [r, { size: REGION_MAX, thorough: true }]),
    ...tiles(3, 0.45).map((r): [Region, DecodeOptions] => [r, { size: REGION_MAX, thorough: true }]),
  ];
  for (const [region, options] of attempts) {
    const text = decode(jsQr, bitmap, bitmap.width, bitmap.height, region, canvas, options);
    if (text) return text;
    if (Date.now() > deadline) return null;
    await yieldToBrowser();
  }
  return null;
}

function findInRegion(jsQr: JsQr, image: HTMLImageElement, region: Region): string | null {
  const canvas = document.createElement("canvas");
  for (const r of [pad(region, 0.1), region]) {
    for (const size of [REGION_MAX, REGION_SMALL]) {
      const text = decode(jsQr, image, image.naturalWidth, image.naturalHeight, r, canvas, { size, thorough: true });
      if (text) return text;
    }
  }
  return null;
}

interface Props {
  /** Called with whatever text the code holds. */
  onResult: (text: string) => void;
}

/** Reads an existing QR code from the camera, or from a photo when there is no camera or it is blocked. */
export default function QrScanner({ onResult }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // A photo the code could not be found in automatically, shown so the person can draw a box round the code.
  // Its object URL. The box is read from the <img> showing it.
  const [photo, setPhoto] = useState<string | null>(null);
  const [box, setBox] = useState<Region | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    const canvas = document.createElement("canvas");

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMessage("This browser cannot use the camera here. Choose a photo of the code instead.");
        return;
      }
      try {
        const [jsQr, media] = await Promise.all([
          loadJsQr(),
          navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false }),
        ]);
        stream = media;
        const video = videoRef.current;
        if (stopped || !video) return;
        video.srcObject = media;
        await video.play();

        let last = 0;
        const tick = (now: number) => {
          if (stopped) return;
          if (now - last >= SCAN_EVERY_MS && video.videoWidth) {
            last = now;
            // Printed codes are dark on light, so the camera skips the inverted pass to keep up with the frames.
            const text = decode(jsQr, video, video.videoWidth, video.videoHeight, WHOLE, canvas, {
              size: Math.min(SCAN_WIDTH, video.videoWidth),
              thorough: false,
            });
            if (text) {
              setOpen(false);
              onResult(text);
              return;
            }
          }
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      } catch (e) {
        if (stopped) return;
        const denied = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError");
        setMessage(
          denied
            ? "Camera access was blocked. Allow it in your browser settings, or choose a photo of the code instead."
            : "Could not start the camera. Choose a photo of the code instead.",
        );
      }
    }

    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, onResult]);

  function closePhoto() {
    if (photo) URL.revokeObjectURL(photo);
    setPhoto(null);
    setBox(null);
  }

  function found(text: string) {
    closePhoto();
    setOpen(false);
    setMessage(null);
    onResult(text);
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    closePhoto();
    setOpen(false);
    setMessage(null);
    setBusy(true);
    try {
      const [jsQr, bitmap] = await Promise.all([loadJsQr(), createImageBitmap(file)]);
      const text = await findInPhoto(jsQr, bitmap);
      bitmap.close();
      if (text) {
        found(text);
        return;
      }
      setPhoto(URL.createObjectURL(file));
      setMessage("Could not find the code by itself. Drag a box round the QR code in the photo.");
    } catch {
      setMessage("Could not read that image. Try a different photo.");
    } finally {
      setBusy(false);
    }
  }

  /** Where the pointer is over the photo, as fractions of its size. */
  function pointAt(e: React.PointerEvent): { x: number; y: number } | null {
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const clamp = (n: number) => Math.min(1, Math.max(0, n));
    return { x: clamp((e.clientX - rect.left) / rect.width), y: clamp((e.clientY - rect.top) / rect.height) };
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const p = pointAt(e);
    if (!p) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = p;
    setBox({ x: p.x, y: p.y, w: 0, h: 0 });
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const start = dragStart.current;
    const p = start && pointAt(e);
    if (!start || !p) return;
    setBox({ x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) });
  }

  async function onPointerUp() {
    dragStart.current = null;
    const image = imageRef.current;
    if (!image || !box) return;
    if (box.w < MIN_BOX || box.h < MIN_BOX) {
      setBox(null);
      return;
    }
    const jsQr = await loadJsQr();
    const text = findInRegion(jsQr, image, box);
    if (text) found(text);
    else setMessage("No code in that box. Try drawing it again, a little bigger than the code.");
  }

  return (
    <div className="collateral-qr-scan">
      <div className="collateral-qr-scan-actions">
        <button
          type="button"
          className="btn ghost small"
          onClick={() => {
            setMessage(null);
            closePhoto();
            setOpen((o) => !o);
          }}
        >
          {open ? "Stop scanning" : "Scan an existing code"}
        </button>
        <button type="button" className="btn ghost small" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? "Looking for the code…" : "Use a photo"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
      </div>
      {open && (
        <video ref={videoRef} className="collateral-qr-video" muted playsInline aria-label="Camera view. Point it at a QR code." />
      )}
      {message && (
        <p className="collateral-field-error" role="status">
          {message}
        </p>
      )}
      {photo && (
        <>
          <div
            className="collateral-qr-crop"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              dragStart.current = null;
              setBox(null);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL of the chosen photo */}
            <img ref={imageRef} src={photo} alt="Your photo. Drag a box round the QR code." draggable={false} />
            {box && (
              <div
                className="collateral-qr-crop-box"
                style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }}
              />
            )}
          </div>
          <div className="collateral-qr-scan-actions">
            <button type="button" className="btn ghost small" onClick={closePhoto}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
