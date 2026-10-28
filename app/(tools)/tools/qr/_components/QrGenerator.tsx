"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { declareCanvasFonts } from "@/lib/collateral/canvasFonts";
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
import { Button } from "@/components/ui/Button";
import { Checkbox, TextInput } from "@/components/ui/Controls";
import { FieldError, Hint, Label } from "@/components/ui/Field";
import StatusMessage from "@/components/ui/StatusMessage";
import {
  ControlsColumn,
  ControlsSection,
  Loading,
  PreviewColumn,
  PreviewMeta,
  Studio,
} from "@/components/tools/kit/Studio";
import styles from "./QrGenerator.module.css";

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
  declareCanvasFonts();
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
  // The web address is capped at 200 characters, which always fits in a code, even with the pause symbol.
  const preview = useMemo(() => {
    if (!target) return null;
    const shape = qrShape(target, 1000, logo);
    const layout = captionLayout(1000, caption, measureCaption);
    const svg = qrSvg(shape, {
      background: PANEL,
      roundedPanel: false,
      caption: layout,
      fontCss: fontCss ?? undefined,
    });
    return { modules: shape.modules, src: svgDataUrl(svg), overflow: layout.overflow };
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

  // The buttons below are disabled until there is a preview, which needs a target.
  async function onDownloadSvg() {
    setMessage(null);
    try {
      const css = hasCaption ? await loadCaptionFonts() : undefined;
      const layout = captionLayout(1000, caption, measureCaption);
      const svg = qrSvg(qrShape(target, 1000, logo), {
        background: PANEL,
        roundedPanel: false,
        caption: layout,
        fontCss: css,
      });
      downloadText(svg, `${stem}.svg`, "image/svg+xml");
    } catch {
      setMessage("Could not load the fonts for the text. Check your connection and try again.");
    }
  }

  async function onDownloadPng() {
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
    setMessage(null);
    try {
      const blob = await canvasToPngBlob(await pngCanvas());
      await navigator.share({ files: [new File([blob], `${stem}.png`, { type: "image/png" })] });
    } catch (e) {
      // Closing the share sheet is not an error.
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setMessage("Could not share the image. Download it instead.");
    }
  }

  async function onCopy() {
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
    <Studio pinned={false}>
      <PreviewColumn>
        <div className={styles.preview}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- generated SVG data URL, not a file next/image can optimise
            <img src={preview.src} alt={`QR code for ${target}`} className={styles.image} />
          ) : (
            <Loading>
              {invalid ? "Check the web address to see the code." : "Type a web address to make a QR code."}
            </Loading>
          )}
        </div>
        {preview && (
          <PreviewMeta>
            Opens{" "}
            <a href={target} target="_blank" rel="noopener noreferrer">
              {target}
            </a>
          </PreviewMeta>
        )}
      </PreviewColumn>

      <ControlsColumn>
        <ControlsSection>
          <Label htmlFor="qr-url">Web address</Label>
          <TextInput
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
            <FieldError id="qr-url-error">
              That does not look like a web address. Try something like pauseai.uk/join.
            </FieldError>
          )}
          <QrScanner onResult={onScan} />
          {scanned !== null && (
            <FieldError announce="status">
              That code does not hold a web address
              {scanned ? (
                <>
                  . It says: <q>{scanned.slice(0, 120)}</q>
                </>
              ) : (
                "."
              )}
            </FieldError>
          )}
          <div className={styles.checkboxes}>
            <Checkbox id="qr-logo" checked={logo} onChange={setLogo}>
              Pause symbol in the middle
            </Checkbox>
            <Checkbox id="qr-show-link" checked={showLink} onChange={setShowLink}>
              Show the link under the code
            </Checkbox>
          </div>
          <Label htmlFor="qr-label" note="(optional)">
            Label under the code{" "}
          </Label>
          <TextInput
            id="qr-label"
            type="text"
            autoComplete="off"
            maxLength={60}
            placeholder="e.g. Join PauseAI UK"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </ControlsSection>

        <ControlsSection>
          <div className={styles.actions}>
            <Button type="button" variant="primary" size="large" onClick={onDownloadPng} disabled={!preview || busy}>
              {busy ? "Preparing…" : "Download PNG"}
            </Button>
            <Button type="button" variant="ghost" size="large" onClick={onDownloadSvg} disabled={!preview}>
              Download SVG
            </Button>
            {handoff === "share" && (
              <Button type="button" variant="ghost" size="large" onClick={onShare} disabled={!preview}>
                Share
              </Button>
            )}
            {handoff === "copy" && (
              <Button type="button" variant="ghost" size="large" onClick={onCopy} disabled={!preview}>
                Copy image
              </Button>
            )}
            {message && <StatusMessage>{message}</StatusMessage>}
          </div>
          <Hint>SVG is best for print. It stays sharp at any size.</Hint>
        </ControlsSection>

        {preview && (
          <ControlsSection heading="Making sure it scans">
            <ul className={styles.tips}>
              <li>
                Print it at least <strong>{qrMinPrintMm(preview.modules)} mm</strong> wide.
              </li>
              {preview.modules >= 53 && <li>This address makes a dense code. A shorter link scans more easily.</li>}
              {preview.overflow && <li>The text under the code is too long to fit. Shorten the label or the link.</li>}
              <li>Test it with a phone before you print.</li>
            </ul>
          </ControlsSection>
        )}
      </ControlsColumn>
    </Studio>
  );
}
