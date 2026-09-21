"use client";

import { useMemo, useState } from "react";
import { downloadCanvasPng, downloadText } from "@/lib/collateral/export";
import { qrFilenameStem, qrMinPrintMm, qrMinScreenPx, qrTarget } from "@/lib/collateral/qr";
import { qrShape, qrSvg } from "@/lib/collateral/qrShape";
import { loadDataUrl } from "@/lib/collateral/render";

const PNG_SIZES = [512, 1024, 2048, 4096];
const PANEL = "#FFFFFF";

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function QrGenerator() {
  const [url, setUrl] = useState("pauseai.uk");
  // UTM tagging is switched off for now, see qrTarget in lib/collateral/qr.ts.
  // const [track, setTrack] = useState(true);
  const track = false;
  const [logo, setLogo] = useState(true);
  const [transparent, setTransparent] = useState(false);
  const [pngSize, setPngSize] = useState(1024);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const target = qrTarget(url, track);
  const background = transparent ? null : PANEL;

  // The preview is the same SVG that gets downloaded.
  const preview = useMemo(() => {
    if (!target) return null;
    try {
      const shape = qrShape(target, 1000, logo);
      return { modules: shape.modules, src: svgDataUrl(qrSvg(shape, { background, roundedPanel: false })) };
    } catch {
      return null;
    }
  }, [target, logo, background]);

  const stem = `pauseai-qr-${qrFilenameStem(url)}`;

  function onDownloadSvg() {
    if (!target) return;
    setMessage(null);
    downloadText(qrSvg(qrShape(target, 1000, logo), { background, roundedPanel: false }), `${stem}.svg`, "image/svg+xml");
  }

  async function onDownloadPng() {
    if (!target) return;
    setBusy(true);
    setMessage(null);
    try {
      const svg = qrSvg(qrShape(target, pngSize, logo), { background, roundedPanel: false });
      const image = await loadDataUrl(svgDataUrl(svg));
      const canvas = document.createElement("canvas");
      canvas.width = pngSize;
      canvas.height = pngSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not supported in this browser");
      ctx.drawImage(image.source, 0, 0, pngSize, pngSize);
      await downloadCanvasPng(canvas, `${stem}-${pngSize}.png`);
    } catch {
      setMessage("Could not create the PNG. Try a smaller size, or download the SVG.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="collateral-studio">
      <div className="collateral-preview">
        <div className="collateral-qr-preview">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- generated SVG data URL, not a file next/image can optimise
            <img
              src={preview.src}
              alt={`QR code for ${target}`}
              className={transparent ? "collateral-qr-image is-transparent" : "collateral-qr-image"}
            />
          ) : (
            <p className="collateral-loading">Type a web address to make a QR code.</p>
          )}
        </div>
        {preview && (
          <p className="collateral-preview-meta">
            Opens <strong>{target}</strong>
          </p>
        )}
      </div>

      <div className="collateral-controls">
        <section>
          <h2>1. Web address</h2>
          <label className="collateral-label" htmlFor="qr-url">
            Where should the code go?
          </label>
          <input
            id="qr-url"
            type="text"
            inputMode="url"
            autoComplete="off"
            maxLength={200}
            placeholder="e.g. pauseai.uk/join"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          {/* UTM tagging is switched off until we have a way to read the results. See qrTarget in lib/collateral/qr.ts.
          <label className="collateral-toggle collateral-qr-track" htmlFor="qr-track">
            <input id="qr-track" type="checkbox" checked={track} onChange={(e) => setTrack(e.target.checked)} />
            Tag the link so scans can be counted
          </label>
          <p className="collateral-hint">Adds utm_source=collateral&amp;utm_medium=qr to the link.</p>
          */}
        </section>

        <section>
          <h2>2. Look</h2>
          <label className="collateral-toggle" htmlFor="qr-logo">
            <input id="qr-logo" type="checkbox" checked={logo} onChange={(e) => setLogo(e.target.checked)} />
            Pause symbol in the middle
          </label>
          <label className="collateral-toggle" htmlFor="qr-transparent">
            <input id="qr-transparent" type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} />
            Transparent background
          </label>
          {transparent && (
            <p className="collateral-hint">Only place a transparent code on a plain, light background, or it may not scan.</p>
          )}
        </section>

        <section>
          <h2>3. Download</h2>
          <label className="collateral-label" htmlFor="qr-size">
            PNG size
          </label>
          <select id="qr-size" value={pngSize} onChange={(e) => setPngSize(Number(e.target.value))}>
            {PNG_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} × {s} px
              </option>
            ))}
          </select>
          <div className="collateral-actions collateral-qr-downloads">
            <button type="button" className="btn primary large" onClick={onDownloadPng} disabled={!preview || busy}>
              {busy ? "Preparing…" : "Download PNG"}
            </button>
            <button type="button" className="btn ghost large" onClick={onDownloadSvg} disabled={!preview}>
              Download SVG
            </button>
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
              <li>
                On a screen, show it at least <strong>{qrMinScreenPx(preview.modules)} px</strong> wide.
              </li>
              <li>Keep the white border around it. Do not crop it or stretch it.</li>
              {preview.modules >= 53 && <li>This address makes a dense code. A shorter link scans more easily.</li>}
              <li>Test it with a phone before you print.</li>
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
