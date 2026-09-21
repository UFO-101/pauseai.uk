"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { downloadCanvasPdf, downloadCanvasPng, downloadText, exportFilename } from "@/lib/collateral/export";
import {
  BLEED_MM,
  DEFAULT_FORMAT_ID,
  FORMAT_GROUPS,
  FORMATS,
  formatDimensionLabel,
  getFormat,
  renderSize,
} from "@/lib/collateral/formats";
import { LIBRARY_PHOTOS, type LibraryPhoto } from "@/lib/collateral/photos";
import { MAX_ZOOM, panPhoto, zoomPhoto } from "@/lib/collateral/photoTransform";
import {
  parseProject,
  QR_LABEL_MAX,
  QR_URL_MAX,
  serializeProject,
  type Project,
  type ProjectPhoto,
} from "@/lib/collateral/project";
import { MAX_QR_CODES, qrPlan, usableQrCodes, type QrCode } from "@/lib/collateral/qr";
import {
  drawableToJpegDataUrl,
  fileToDrawable,
  loadDataUrl,
  loadFonts,
  loadImage,
  renderCollateral,
} from "@/lib/collateral/render";
import {
  DEFAULT_TEMPLATE_ID,
  defaultValues,
  getTemplate,
  TEMPLATES,
  type Drawable,
  type PhotoSettings,
  type Values,
} from "@/lib/collateral/templates";
import { DEFAULT_THEME_ID, getTheme, THEMES } from "@/lib/collateral/themes";

const STORAGE_KEY = "pauseai-collateral-v2";
const PREVIEW_MAX_SIDE = 1400;
const MAX_PROJECT_FILE_BYTES = 12_000_000;

const DEFAULT_PHOTO_SETTINGS: PhotoSettings = { zoom: 1, focalX: 0.5, focalY: 0.5, visible: 0.25 };
const NEW_QR: QrCode = { label: "Scan to join", url: "pauseai.uk" };

interface PhotoState {
  drawable: Drawable;
  name: string;
  source: { kind: "library"; id: string } | { kind: "upload" };
}

export default function CollateralStudio() {
  const [formatId, setFormatId] = useState(DEFAULT_FORMAT_ID);
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID);
  const [themeId, setThemeId] = useState<string>(DEFAULT_THEME_ID);
  const [valuesByTemplate, setValuesByTemplate] = useState<Record<string, Values>>({});
  const [qrCodes, setQrCodes] = useState<QrCode[]>([]);
  // UTM tagging is switched off for now, see qrTarget in lib/collateral/qr.ts.
  const [trackQr, setTrackQr] = useState(false);
  const [photo, setPhoto] = useState<PhotoState | null>(null);
  const [photoSettings, setPhotoSettings] = useState<PhotoSettings>(DEFAULT_PHOTO_SETTINGS);
  const [logo, setLogo] = useState<Drawable | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const openInputRef = useRef<HTMLInputElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  const format = getFormat(formatId);
  const template = getTemplate(templateId);
  const theme = getTheme(themeId);
  // Merge over defaults so fields added after a volunteer's last visit still get a value.
  const values = { ...defaultValues(template), ...valuesByTemplate[template.id] };

  // QR codes are only drawn when they can be big enough to scan.
  const exportSize = renderSize(format);
  const usableCodes = usableQrCodes(qrCodes);
  const qrAvailability = qrPlan({
    width: exportSize.width,
    height: exportSize.height,
    dpi: exportSize.dpi,
    urls: usableCodes.map((c) => c.url),
    track: trackQr,
  });

  const currentProject = useCallback(
    (projectPhoto: ProjectPhoto | null): Project => ({
      formatId,
      templateId,
      themeId,
      values: valuesByTemplate,
      qrCodes,
      trackQr,
      photo: projectPhoto,
      photoSettings,
    }),
    [formatId, templateId, themeId, valuesByTemplate, qrCodes, trackQr, photoSettings],
  );

  // Puts a saved or restored project on screen. Returns false if its photo could not be loaded.
  const applyProject = useCallback(async (project: Project): Promise<boolean> => {
    setFormatId(project.formatId);
    setTemplateId(project.templateId);
    setThemeId(project.themeId);
    setValuesByTemplate(project.values);
    setQrCodes(project.qrCodes);
    setTrackQr(project.trackQr);
    setPhotoSettings(project.photoSettings);
    if (!project.photo) {
      setPhoto(null);
      return true;
    }
    try {
      if (project.photo.kind === "library") {
        const id = project.photo.id;
        const item = LIBRARY_PHOTOS.find((p) => p.id === id);
        if (!item) return false;
        setPhoto({ drawable: await loadImage(item.src), name: item.label, source: { kind: "library", id } });
      } else {
        setPhoto({ drawable: await loadDataUrl(project.photo.dataUrl), name: project.photo.name, source: { kind: "upload" } });
      }
      return true;
    } catch {
      setPhoto(null);
      return false;
    }
  }, []);

  // Restore the last session once on the client.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const result = raw ? parseProject(raw) : null;
        if (result?.ok) await applyProject(result.project);
      } catch {
        // Storage can be blocked (private windows etc). The tool works without it.
      }
      if (!cancelled) setRestored(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [applyProject]);

  // Autosave. Uploaded photos are not kept (too big for browser storage), library photos are.
  useEffect(() => {
    if (!restored) return;
    try {
      const saved = photo?.source.kind === "library" ? ({ kind: "library", id: photo.source.id } as const) : null;
      localStorage.setItem(STORAGE_KEY, serializeProject(currentProject(saved)));
    } catch {
      // Ignore, see above.
    }
  }, [restored, photo, currentProject]);

  useEffect(() => {
    let cancelled = false;
    loadFonts()
      .catch(() => undefined)
      .then(() => {
        if (!cancelled) setFontsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadImage(theme.logoSrc)
      .then((img) => {
        if (!cancelled) setLogo(img);
      })
      .catch(() => {
        if (!cancelled) setMessage("Could not load the logo.");
      });
    return () => {
      cancelled = true;
    };
  }, [theme.logoSrc]);

  // Live preview, redrawn on every change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !logo || !fontsReady) return;
    renderCollateral(canvas, {
      format,
      template,
      theme,
      values,
      logo,
      photo: photo?.drawable ?? null,
      photoSettings,
      qrCodes,
      trackQr,
      maxSide: PREVIEW_MAX_SIDE,
    });
  });

  // Scroll wheel and trackpad pinch zoom the photo. Needs a non-passive listener to stop the page scrolling.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !photo) return;
    const img = { w: photo.drawable.width, h: photo.drawable.height };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const k = canvas.width / rect.width;
      const anchor = { x: (e.clientX - rect.left) * k, y: (e.clientY - rect.top) * k };
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const factor = Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015));
      setPhotoSettings((s) => ({ ...s, ...zoomPhoto(img, { w: canvas.width, h: canvas.height }, s, s.zoom * factor, anchor) }));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [photo]);

  function canvasScale(): number {
    const canvas = canvasRef.current;
    if (!canvas) return 1;
    return canvas.width / canvas.getBoundingClientRect().width;
  }

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!photo) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: photoSettings.zoom };
    }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const prev = pointers.current.get(e.pointerId);
    if (!photo || !canvas || !prev) return;
    const next = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, next);
    const img = { w: photo.drawable.width, h: photo.drawable.height };
    const box = { w: canvas.width, h: canvas.height };
    const k = canvasScale();
    if (pointers.current.size === 1) {
      setPhotoSettings((s) => ({ ...s, ...panPhoto(img, box, s, (next.x - prev.x) * k, (next.y - prev.y) * k) }));
    } else if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const rect = canvas.getBoundingClientRect();
      const mid = { x: ((a.x + b.x) / 2 - rect.left) * k, y: ((a.y + b.y) / 2 - rect.top) * k };
      const zoom = (pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.dist;
      setPhotoSettings((s) => ({ ...s, ...zoomPhoto(img, box, s, zoom, mid) }));
    }
  }

  function onPointerEnd(e: ReactPointerEvent<HTMLCanvasElement>) {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
  }

  const setValue = useCallback(
    (key: string, value: string) => {
      setValuesByTemplate((prev) => ({
        ...prev,
        [template.id]: { ...defaultValues(template), ...prev[template.id], [key]: value },
      }));
    },
    [template],
  );

  function updateQr(index: number, patch: Partial<QrCode>) {
    setQrCodes((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setMessage(null);
    try {
      const drawable = await fileToDrawable(file);
      setPhoto({ drawable, name: file.name, source: { kind: "upload" } });
      setPhotoSettings(DEFAULT_PHOTO_SETTINGS);
    } catch {
      setMessage("Could not read that image. Try a JPG or PNG.");
    }
  }

  async function onLibraryPhoto(item: LibraryPhoto) {
    setMessage(null);
    try {
      setPhoto({ drawable: await loadImage(item.src), name: item.label, source: { kind: "library", id: item.id } });
      setPhotoSettings(DEFAULT_PHOTO_SETTINGS);
    } catch {
      setMessage("Could not load that photo.");
    }
  }

  function renderOptions(bleed: boolean) {
    return {
      format,
      template,
      theme,
      values,
      logo: logo!,
      photo: photo?.drawable ?? null,
      photoSettings,
      qrCodes,
      trackQr,
      bleed,
    };
  }

  async function onDownloadPng() {
    if (!logo) return;
    setBusy(true);
    setMessage(null);
    try {
      const canvas = document.createElement("canvas");
      renderCollateral(canvas, renderOptions(false));
      await downloadCanvasPng(canvas, exportFilename([template.id, format.id, theme.id], "png"));
    } catch {
      setMessage("Could not create the image. Try a smaller format.");
    } finally {
      setBusy(false);
    }
  }

  async function onDownloadPdf() {
    if (!logo || format.kind !== "print") return;
    setBusy(true);
    setMessage(null);
    try {
      const canvas = document.createElement("canvas");
      renderCollateral(canvas, renderOptions(true));
      await downloadCanvasPdf(canvas, format, BLEED_MM, exportFilename([template.id, format.id, theme.id], "pdf"));
    } catch {
      setMessage("Could not create the PDF. Try again, or download the PNG instead.");
    } finally {
      setBusy(false);
    }
  }

  function onSaveProject() {
    setMessage(null);
    try {
      let projectPhoto: ProjectPhoto | null = null;
      if (photo?.source.kind === "library") projectPhoto = { kind: "library", id: photo.source.id };
      else if (photo) projectPhoto = { kind: "upload", name: photo.name, dataUrl: drawableToJpegDataUrl(photo.drawable) };
      downloadText(
        serializeProject(currentProject(projectPhoto)),
        exportFilename([template.id, format.id, "project"], "json"),
        "application/json",
      );
      setMessage("Project saved. Use “Open project” to carry on editing later.");
    } catch {
      setMessage("Could not save the project.");
    }
  }

  async function onOpenProject(file: File | undefined) {
    if (openInputRef.current) openInputRef.current.value = "";
    if (!file) return;
    setMessage(null);
    if (file.size > MAX_PROJECT_FILE_BYTES) {
      setMessage("That file is too big to be a saved project.");
      return;
    }
    const result = parseProject(await file.text());
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    const photoOk = await applyProject(result.project);
    setMessage(photoOk ? `Opened ${file.name}.` : `Opened ${file.name}, but its photo could not be loaded.`);
  }

  function onReset() {
    setValuesByTemplate((prev) => ({ ...prev, [template.id]: defaultValues(template) }));
    setQrCodes([]);
    setPhoto(null);
    setPhotoSettings(DEFAULT_PHOTO_SETTINGS);
  }

  return (
    <div className="collateral-studio">
      <div className="collateral-preview">
        <div className="collateral-preview-frame">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Preview of ${format.label}`}
            hidden={!logo || !fontsReady}
            className={photo ? "is-draggable" : undefined}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
          />
          {(!logo || !fontsReady) && <p className="collateral-loading">Loading…</p>}
        </div>
        <p className="collateral-preview-meta">
          {format.label} · {formatDimensionLabel(format)}
        </p>
        {photo && <p className="collateral-preview-meta">Drag the photo to move it. Scroll or pinch to zoom.</p>}
      </div>

      <div className="collateral-controls">
        <section>
          <h2>1. Format</h2>
          <label className="collateral-label" htmlFor="collateral-format">
            Where will it be used?
          </label>
          <select id="collateral-format" value={format.id} onChange={(e) => setFormatId(e.target.value)}>
            {FORMAT_GROUPS.map((group) => (
              <optgroup key={group} label={group}>
                {FORMATS.filter((f) => f.group === group).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label} ({formatDimensionLabel(f)})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </section>

        <section>
          <h2>2. Layout</h2>
          <div className="collateral-choice-grid" role="radiogroup" aria-label="Layout">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={t.id === template.id}
                className="collateral-choice"
                onClick={() => setTemplateId(t.id)}
              >
                <strong>{t.label}</strong>
                <span>{t.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2>3. Style</h2>
          <div className="collateral-swatches" role="radiogroup" aria-label="Style">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={t.id === theme.id}
                className="collateral-swatch"
                onClick={() => setThemeId(t.id)}
              >
                <span className="collateral-swatch-chip" style={{ background: t.bg, color: t.text }} aria-hidden="true">
                  <i style={{ background: t.accent }} />
                </span>
                {t.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2>4. Text</h2>
          {template.fields.map((field) => {
            const id = `collateral-${template.id}-${field.key}`;
            const value = values[field.key] ?? "";
            if (field.kind === "toggle") {
              return (
                <label key={field.key} className="collateral-toggle" htmlFor={id}>
                  <input
                    id={id}
                    type="checkbox"
                    checked={value === "true"}
                    onChange={(e) => setValue(field.key, e.target.checked ? "true" : "false")}
                  />
                  {field.label}
                </label>
              );
            }
            return (
              <div key={field.key} className="collateral-field">
                <label className="collateral-label" htmlFor={id}>
                  {field.label}
                  {field.hint && <span> · {field.hint}</span>}
                </label>
                {field.kind === "textarea" ? (
                  <textarea
                    id={id}
                    rows={2}
                    maxLength={field.maxLength}
                    value={value}
                    onChange={(e) => setValue(field.key, e.target.value)}
                  />
                ) : (
                  <input
                    id={id}
                    type="text"
                    maxLength={field.maxLength}
                    value={value}
                    onChange={(e) => setValue(field.key, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </section>

        <section>
          <h2>5. QR codes (optional)</h2>
          {qrCodes.map((code, i) => (
            <div key={i} className="collateral-qr-row">
              <div className="collateral-qr-fields">
                <input
                  type="text"
                  aria-label={`QR code ${i + 1} label`}
                  placeholder="Label under the code, e.g. RSVP"
                  maxLength={QR_LABEL_MAX}
                  value={code.label}
                  onChange={(e) => updateQr(i, { label: e.target.value })}
                />
                <input
                  type="text"
                  aria-label={`QR code ${i + 1} web address`}
                  placeholder="Web address, e.g. pauseai.uk/join"
                  maxLength={QR_URL_MAX}
                  value={code.url}
                  onChange={(e) => updateQr(i, { url: e.target.value })}
                />
              </div>
              <button
                type="button"
                className="collateral-qr-remove"
                aria-label={`Remove QR code ${i + 1}`}
                onClick={() => setQrCodes((prev) => prev.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn ghost small"
            disabled={qrCodes.length >= MAX_QR_CODES}
            onClick={() => setQrCodes((prev) => [...prev, { ...NEW_QR }])}
          >
            {qrCodes.length === 0 ? "Add a QR code" : `Add another (${qrCodes.length} of ${MAX_QR_CODES})`}
          </button>
          {/* UTM tagging is switched off until we have a way to read the results. See qrTarget in lib/collateral/qr.ts.
          {usableCodes.length > 0 && (
            <label className="collateral-toggle collateral-qr-track" htmlFor="collateral-track">
              <input id="collateral-track" type="checkbox" checked={trackQr} onChange={(e) => setTrackQr(e.target.checked)} />
              Tag the links so scans can be counted
            </label>
          )}
          */}
          {qrCodes.length > 0 && qrAvailability.reason && <p className="collateral-hint">{qrAvailability.reason}</p>}
        </section>

        <section>
          <h2>6. Photo (optional)</h2>
          <p className="collateral-hint">Pick one of ours:</p>
          <div className="collateral-photo-grid">
            {LIBRARY_PHOTOS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="collateral-photo-thumb"
                aria-label={item.label}
                aria-pressed={photo?.source.kind === "library" && photo.source.id === item.id}
                title={item.label}
                onClick={() => onLibraryPhoto(item)}
                style={{ backgroundImage: `url(${item.thumb})` }}
              />
            ))}
          </div>
          <p className="collateral-hint">…or upload your own:</p>
          <input
            type="file"
            accept="image/*"
            aria-label="Upload a photo"
            onChange={(e) => onPhoto(e.target.files?.[0])}
          />
          {photo && (
            <div className="collateral-photo-controls">
              <p className="collateral-hint">
                {photo.name} · stays in your browser
                <button type="button" className="collateral-link" onClick={() => setPhoto(null)}>
                  Remove
                </button>
              </p>
              <Slider
                label="Zoom"
                min={1}
                max={MAX_ZOOM}
                step={0.05}
                value={photoSettings.zoom}
                onChange={(zoom) => setPhotoSettings((s) => ({ ...s, zoom }))}
              />
              <Slider
                label="Left / right"
                min={0}
                max={1}
                step={0.01}
                value={photoSettings.focalX}
                onChange={(focalX) => setPhotoSettings((s) => ({ ...s, focalX }))}
              />
              <Slider
                label="Up / down"
                min={0}
                max={1}
                step={0.01}
                value={photoSettings.focalY}
                onChange={(focalY) => setPhotoSettings((s) => ({ ...s, focalY }))}
              />
              <Slider
                label="Photo strength"
                min={0.1}
                max={0.7}
                step={0.01}
                value={photoSettings.visible}
                onChange={(visible) => setPhotoSettings((s) => ({ ...s, visible }))}
              />
            </div>
          )}
        </section>

        <section className="collateral-actions">
          <button type="button" className="btn primary large" onClick={onDownloadPng} disabled={busy || !logo || !fontsReady}>
            {busy ? "Preparing…" : "Download PNG"}
          </button>
          {format.kind === "print" && (
            <button type="button" className="btn primary large" onClick={onDownloadPdf} disabled={busy || !logo || !fontsReady}>
              {busy ? "Preparing…" : `Download print PDF (+${BLEED_MM} mm bleed)`}
            </button>
          )}
          <button type="button" className="btn ghost large" onClick={onReset}>
            Reset
          </button>
          {message && (
            <p className="collateral-message" role="status">
              {message}
            </p>
          )}
        </section>

        <section>
          <h2>Save your work</h2>
          <p className="collateral-hint">
            Save a project file to edit later or send to another volunteer. It holds your text, style, QR codes and photo. It is
            not uploaded anywhere.
          </p>
          <div className="collateral-actions">
            <button type="button" className="btn ghost" onClick={onSaveProject} disabled={!restored}>
              Save project
            </button>
            <button type="button" className="btn ghost" onClick={() => openInputRef.current?.click()}>
              Open project
            </button>
            <input
              ref={openInputRef}
              type="file"
              accept=".json,application/json"
              hidden
              aria-label="Open a saved project"
              onChange={(e) => onOpenProject(e.target.files?.[0])}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

function Slider({ label, min, max, step, value, onChange }: SliderProps) {
  return (
    <label className="collateral-slider">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
