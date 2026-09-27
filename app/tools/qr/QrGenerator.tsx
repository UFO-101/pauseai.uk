"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { canvasToPngBlob, downloadCanvasPng, downloadText } from "@/lib/collateral/export";
import { isWebAddress, qrFilenameStem, qrMinPrintMm, qrTarget } from "@/lib/collateral/qr";
import { qrShape, qrSvg } from "@/lib/collateral/qrShape";
import { loadDataUrl } from "@/lib/collateral/render";
import QrScanner from "./QrScanner";

/** Big enough for print and slides. The SVG covers anything larger. */
const PNG_SIZE = 2048;
const PANEL = "#FFFFFF";

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

  // The preview is the same SVG that gets downloaded.
  const preview = useMemo(() => {
    if (!target) return null;
    try {
      const shape = qrShape(target, 1000, logo);
      return { modules: shape.modules, src: svgDataUrl(qrSvg(shape, { background: PANEL, roundedPanel: false })) };
    } catch {
      return null;
    }
  }, [target, logo]);

  async function pngCanvas(): Promise<HTMLCanvasElement> {
    const svg = qrSvg(qrShape(target, PNG_SIZE, logo), { background: PANEL, roundedPanel: false });
    const image = await loadDataUrl(svgDataUrl(svg));
    const canvas = document.createElement("canvas");
    canvas.width = PNG_SIZE;
    canvas.height = PNG_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not supported in this browser");
    ctx.drawImage(image.source, 0, 0, PNG_SIZE, PNG_SIZE);
    return canvas;
  }

  function onDownloadSvg() {
    if (!target) return;
    setMessage(null);
    downloadText(qrSvg(qrShape(target, 1000, logo), { background: PANEL, roundedPanel: false }), `${stem}.svg`, "image/svg+xml");
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
              <li>Test it with a phone before you print.</li>
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
