"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { canvasToPngBlob, downloadCanvasPng, downloadText } from "@/lib/collateral/export";
import { isWebAddress, qrFilenameStem, qrMinPrintMm, qrTarget } from "@/lib/collateral/qr";
import {
  CAPTION_FONTS,
  captionFont,
  captionFontCss,
  captionLayout,
  displayLink,
  type CaptionMeasure,
  type QrCaption,
} from "@/lib/collateral/qrCaption";
import { qrShape, qrSvg } from "@/lib/collateral/qrShape";
import { loadDataUrl } from "@/lib/collateral/render";
import { INK } from "@/lib/collateral/themes";
import QrScanner from "./QrScanner";

/** Big enough for print and slides. The SVG covers anything larger. */
const PNG_SIZE = 2048;
const PANEL = "#FFFFFF";

let measureCtx: CanvasRenderingContext2D | null = null;
const measureCaption: CaptionMeasure = (kind, text, fontSize) => {
  measureCtx ??= document.createElement("canvas").getContext("2d");
  if (!measureCtx) return text.length * fontSize * 0.55;
  measureCtx.font = captionFont(kind, fontSize);
  return measureCtx.measureText(text).width;
};

/** Loads the caption fonts into the page, for measuring and the PNG, and returns them inlined, for the SVG. */
async function loadCaptionFonts(): Promise<string> {
  const kinds = Object.keys(CAPTION_FONTS) as (keyof typeof CAPTION_FONTS)[];
  const [css] = await Promise.all([captionFontCss(), ...kinds.map((k) => document.fonts.load(captionFont(k, 40)))]);
  return css;
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** How this browser can hand the PNG over besides downloading it: the share sheet on phones, the clipboard elsewhere. */
type Handoff = "share" | "copy" | null;

const noSubscribe = () => () => {};

function detectHandoff(): Handoff {
  const probe = new File([""], "qr.png", { type: "image/png" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] })) return "share";
  if (typeof ClipboardItem !== "undefined" && typeof navigator.clipboard?.write === "function") return "copy";
  return null;
}

export default function QrGenerator() {
  const [url, setUrl] = useState("pauseai.uk");
  // UTM tagging is switched off for now, see qrTarget in lib/collateral/qr.ts.
  const track = false;
  const [logo, setLogo] = useState(true);
  const [showLink, setShowLink] = useState(false);
  const [label, setLabel] = useState("");
  // Inlined caption fonts. Also marks the fonts as loaded, so captions are measured in the right font.
  const [fontCss, setFontCss] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [scanned, setScanned] = useState<string | null>(null);
  // Browser features, so unknown while rendering on the server. They never change, so there is nothing to subscribe to.
  const handoff = useSyncExternalStore(noSubscribe, detectHandoff, () => null);

  // Stable, so the scanner does not restart the camera on every render.
  const onScan = useCallback((text: string) => {
    const trimmed = text.trim();
    if (isWebAddress(trimmed)) {
      setUrl(trimmed);
      setScanned(null);
    } else {
      setScanned(trimmed);
    }
  }, []);

  const valid = isWebAddress(url);
  const target = valid ? qrTarget(url, track) : "";
  const stem = `pauseai-qr-${qrFilenameStem(url)}`;

  const caption: QrCaption = useMemo(
    () => ({ label: label.trim(), link: showLink && target ? displayLink(target) : "" }),
    [label, showLink, target],
  );
  const hasCaption = caption.label !== "" || caption.link !== "";

  // Fetched the first time a caption is asked for, as the fonts are about 95 KB.
  useEffect(() => {
    if (!hasCaption || fontCss) return;
    let cancelled = false;
    loadCaptionFonts()
      .then((css) => !cancelled && setFontCss(css))
      .catch(() => {
        // The preview falls back to system fonts. Downloads try again and report a failure then.
      });
    return () => {
      cancelled = true;
    };
  }, [hasCaption, fontCss]);

  // The preview is the same SVG that gets downloaded.
  const preview = useMemo(() => {
    if (!target) return null;
    try {
      const shape = qrShape(target, 1000, logo);
      const layout = captionLayout(1000, caption, measureCaption);
      const svg = qrSvg(shape, { background: PANEL, roundedPanel: false, caption: layout, fontCss: fontCss ?? undefined });
      return { modules: shape.modules, src: svgDataUrl(svg), overflow: layout.overflow };
    } catch {
      return null;
    }
    // fontCss is a dependency because measurements change once the fonts have loaded.
  }, [target, logo, caption, fontCss]);

  async function pngCanvas(): Promise<HTMLCanvasElement> {
    if (hasCaption) await loadCaptionFonts();
    const layout = captionLayout(PNG_SIZE, caption, measureCaption);
    const svg = qrSvg(qrShape(target, PNG_SIZE, logo), { background: PANEL, roundedPanel: false });
    const image = await loadDataUrl(svgDataUrl(svg));
    const canvas = document.createElement("canvas");
    canvas.width = PNG_SIZE;
    canvas.height = layout.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not supported in this browser");
    ctx.fillStyle = PANEL;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image.source, 0, 0, PNG_SIZE, PNG_SIZE);
    // Drawn on the canvas rather than in the SVG: an SVG drawn as an image cannot be relied on to have its fonts ready.
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    for (const line of layout.lines) {
      ctx.font = captionFont(line.kind, line.fontSize);
      ctx.fillText(line.text, PNG_SIZE / 2, line.baseline);
    }
    return canvas;
  }

  async function onDownloadSvg() {
    if (!target) return;
    setMessage(null);
    try {
      const css = hasCaption ? await loadCaptionFonts() : undefined;
      const layout = captionLayout(1000, caption, measureCaption);
      const svg = qrSvg(qrShape(target, 1000, logo), { background: PANEL, roundedPanel: false, caption: layout, fontCss: css });
      downloadText(svg, `${stem}.svg`, "image/svg+xml");
    } catch {
      setMessage("Could not load the fonts for the text. Check your connection and try again.");
    }
  }

  async function onDownloadPng() {
    if (!target) return;
    setBusy(true);
    setMessage(null);
    try {
      await downloadCanvasPng(await pngCanvas(), `${stem}.png`);
    } catch {
      setMessage("Could not create the PNG. Try the SVG instead.");
    } finally {
      setBusy(false);
    }
  }

  async function onShare() {
    if (!target) return;
    setMessage(null);
    try {
      const blob = await canvasToPngBlob(await pngCanvas());
      await navigator.share({ files: [new File([blob], `${stem}.png`, { type: "image/png" })] });
    } catch (e) {
      // Closing the share sheet is not an error.
      if (!(e instanceof DOMException && e.name === "AbortError")) setMessage("Could not share the image. Download it instead.");
    }
  }

  async function onCopy() {
    if (!target) return;
    setMessage(null);
    try {
      // Safari only allows the write if the promise for the image is handed over straight away.
      const blob = pngCanvas().then(canvasToPngBlob);
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setMessage("Copied. Paste it into your document or message.");
    } catch {
      setMessage("Could not copy the image. Download it instead.");
    }
  }

  const invalid = url.trim() !== "" && !valid;

  return (
    <div className="collateral-studio is-qr">
      <div className="collateral-preview">
        <div className="collateral-qr-preview">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- generated SVG data URL, not a file next/image can optimise
            <img src={preview.src} alt={`QR code for ${target}`} className="collateral-qr-image" />
          ) : (
            <p className="collateral-loading">{invalid ? "Check the web address to see the code." : "Type a web address to make a QR code."}</p>
          )}
        </div>
        {preview && (
          <p className="collateral-preview-meta">
            Opens{" "}
            <a href={target} target="_blank" rel="noopener noreferrer">
              {target}
            </a>
          </p>
        )}
      </div>

      <div className="collateral-controls">
        <section>
          <label className="collateral-label" htmlFor="qr-url">
            Web address
          </label>
          <input
            id="qr-url"
            type="text"
            inputMode="url"
            autoComplete="off"
            maxLength={200}
            placeholder="e.g. pauseai.uk/join"
            value={url}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? "qr-url-error" : undefined}
            onChange={(e) => {
              setUrl(e.target.value);
              setScanned(null);
            }}
          />
          {invalid && (
            <p id="qr-url-error" className="collateral-field-error">
              That does not look like a web address. Try something like pauseai.uk/join.
            </p>
          )}
          <QrScanner onResult={onScan} />
          {scanned !== null && (
            <p className="collateral-field-error" role="status">
              That code does not hold a web address{scanned ? <>. It says: <q>{scanned.slice(0, 120)}</q></> : "."}
            </p>
          )}
          <label className="collateral-toggle collateral-qr-logo" htmlFor="qr-logo">
            <input id="qr-logo" type="checkbox" checked={logo} onChange={(e) => setLogo(e.target.checked)} />
            Pause symbol in the middle
          </label>
          <label className="collateral-toggle" htmlFor="qr-show-link">
            <input id="qr-show-link" type="checkbox" checked={showLink} onChange={(e) => setShowLink(e.target.checked)} />
            Show the link under the code
          </label>
          <label className="collateral-label" htmlFor="qr-label">
            Label under the code <span>(optional)</span>
          </label>
          <input
            id="qr-label"
            type="text"
            autoComplete="off"
            maxLength={60}
            placeholder="e.g. Join PauseAI UK"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </section>

        <section>
          <div className="collateral-actions">
            <button type="button" className="btn primary large" onClick={onDownloadPng} disabled={!preview || busy}>
              {busy ? "Preparing…" : "Download PNG"}
            </button>
            <button type="button" className="btn ghost large" onClick={onDownloadSvg} disabled={!preview}>
              Download SVG
            </button>
            {handoff === "share" && (
              <button type="button" className="btn ghost large" onClick={onShare} disabled={!preview}>
                Share
              </button>
            )}
            {handoff === "copy" && (
              <button type="button" className="btn ghost large" onClick={onCopy} disabled={!preview}>
                Copy image
              </button>
            )}
            {message && (
              <p className="collateral-message" role="status">
                {message}
              </p>
            )}
          </div>
          <p className="collateral-hint">SVG is best for print. It stays sharp at any size.</p>
        </section>

        {preview && (
          <section>
            <h2>Making sure it scans</h2>
            <ul className="collateral-tips">
              <li>
                Print it at least <strong>{qrMinPrintMm(preview.modules)} mm</strong> wide.
              </li>
              {preview.modules >= 53 && <li>This address makes a dense code. A shorter link scans more easily.</li>}
              {preview.overflow && <li>The text under the code is too long to fit. Shorten the label or the link.</li>}
              <li>Test it with a phone before you print.</li>
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
