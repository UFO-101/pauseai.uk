"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  canvasToPngBlob,
  downloadPlatformBundleZip,
  downloadText,
  exportFilename,
  pdfBytesDigital,
  type PlatformExportGroup,
} from "@/lib/collateral/export";
import { DEFAULT_FORMAT_ID, formatDimensionLabel, getFormat, type Format } from "@/lib/collateral/formats";
import {
  CAPTION_MAX,
  DEFAULT_SLIDE_PHOTO_SETTINGS,
  EXAMPLE_SLIDE,
  MAX_SLIDES,
  MIN_SLIDES,
  newSlide,
  newSlideId,
  type Slide,
  type SlidePhoto,
} from "@/lib/collateral/gallery";
import {
  parseGalleryProject,
  serializeGalleryProject,
  type GalleryProject,
  type GallerySlideData,
} from "@/lib/collateral/galleryProject";
import { LIBRARY_PHOTOS, type LibraryPhoto } from "@/lib/collateral/photos";
import { panPhoto, zoomPhoto } from "@/lib/collateral/photoTransform";
import { ALL_PLATFORM_IDS, CAROUSEL_PLATFORMS, type PlatformId } from "@/lib/collateral/platforms";
import type { ProjectPhoto } from "@/lib/collateral/project";
import { drawableToJpegDataUrl, fileToDrawable, loadDataUrl, loadFonts, loadImage, renderCollateral } from "@/lib/collateral/render";
import { getTemplate, type Drawable } from "@/lib/collateral/templates";
import { DEFAULT_THEME_ID, getTheme } from "@/lib/collateral/themes";
import CharCount from "./CharCount";
import CropControls from "./CropControls";
import ProjectMenu from "./ProjectMenu";
import StylePicker from "./StylePicker";

const CAPTION_TEMPLATE = getTemplate("caption");
const STORAGE_KEY = "pauseai-collateral-gallery-v1";
const PREVIEW_MAX_SIDE = 1400;
const THUMB_MAX_SIDE = 160;
const MAX_PROJECT_FILE_BYTES = 12_000_000 * MAX_SLIDES;
const RESET_MESSAGE = "Started a new gallery.";

/** Slide 1 filled in with an example, slide 2 empty. Falls back to two empty slides if the photo will not load. */
async function exampleSlides(): Promise<Slide[]> {
  const item = LIBRARY_PHOTOS.find((p) => p.id === EXAMPLE_SLIDE.photoId);
  if (!item) return [newSlide(), newSlide()];
  try {
    const drawable = await loadImage(item.src);
    const first: Slide = {
      ...newSlide(),
      photo: { drawable, name: item.label, source: { kind: "library", id: item.id } },
      caption: EXAMPLE_SLIDE.caption,
    };
    return [first, newSlide()];
  } catch {
    return [newSlide(), newSlide()];
  }
}

/** A distinct crop the selected platforms need, e.g. 4:5 for Instagram and LinkedIn, square for X. */
interface PreviewCrop {
  formatId: string;
  label: string;
}

function SlideThumb(props: {
  slide: Slide;
  format: Format;
  logo: Drawable;
  index: number;
  active: boolean;
  onSelect: () => void;
}) {
  const { slide, format, logo, index, active, onSelect } = props;
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    renderCollateral(ref.current, {
      format,
      template: CAPTION_TEMPLATE,
      theme: getTheme(slide.themeId),
      values: { caption: slide.caption },
      logo,
      photo: slide.photo?.drawable ?? null,
      photoSettings: slide.photoSettings,
      qrCodes: [],
      trackQr: false,
      maxSide: THUMB_MAX_SIDE,
    });
  });
  return (
    <button type="button" aria-label={`Show slide ${index + 1}`} aria-current={active} onClick={onSelect}>
      <canvas ref={ref} aria-hidden="true" />
      <span>{index + 1}</span>
    </button>
  );
}

export default function GalleryStudio() {
  const [platforms, setPlatforms] = useState<Set<PlatformId>>(() => new Set(ALL_PLATFORM_IDS));
  const [slides, setSlides] = useState<Slide[]>(() => [newSlide(), newSlide()]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [logo, setLogo] = useState<Drawable | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Restores what the last Reset cleared. Only offered while the reset message is showing.
  const [undoReset, setUndoReset] = useState<(() => void) | null>(null);
  // Which platform crop the preview shows, when the selected platforms need more than one.
  const [previewFormatId, setPreviewFormatId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  const previewCrops: PreviewCrop[] = [];
  for (const v of CAROUSEL_PLATFORMS) {
    if (!platforms.has(v.platform)) continue;
    const crop = previewCrops.find((c) => c.formatId === v.formatId);
    if (crop) crop.label += ` · ${v.label}`;
    else previewCrops.push({ formatId: v.formatId, label: v.label });
  }
  const previewCrop = previewCrops.find((c) => c.formatId === previewFormatId) ?? previewCrops[0];
  const effectiveFormat = getFormat(previewCrop?.formatId ?? DEFAULT_FORMAT_ID);
  const activeSlide = slides[Math.min(activeIndex, slides.length - 1)] ?? slides[0];
  const activeTheme = getTheme(activeSlide.themeId);
  const photo = activeSlide.photo;
  const photoSettings = activeSlide.photoSettings;

  const updateSlide = useCallback((id: string, patch: Partial<Slide> | ((s: Slide) => Partial<Slide>)) => {
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...(typeof patch === "function" ? patch(s) : patch) } : s)));
  }, []);

  const projectPhoto = (p: SlidePhoto | null, embed: boolean): ProjectPhoto | null => {
    if (!p) return null;
    if (p.source.kind === "library") return { kind: "library", id: p.source.id };
    return embed ? { kind: "upload", name: p.name, dataUrl: drawableToJpegDataUrl(p.drawable) } : null;
  };

  const currentProject = useCallback(
    (embed: boolean): GalleryProject => ({
      slides: slides.map(
        (s): GallerySlideData => ({ photo: projectPhoto(s.photo, embed), photoSettings: s.photoSettings, caption: s.caption, themeId: s.themeId }),
      ),
      platforms: Array.from(platforms),
    }),
    [slides, platforms],
  );

  // Puts a saved or restored gallery on screen. Returns false if any photo could not be loaded.
  const applyProject = useCallback(async (project: GalleryProject): Promise<boolean> => {
    setPlatforms(new Set(project.platforms));
    let allOk = true;
    const loaded = await Promise.all(
      project.slides.map(async (s): Promise<Slide> => {
        const ref = s.photo;
        if (!ref) return { id: newSlideId(), photo: null, photoSettings: s.photoSettings, caption: s.caption, themeId: s.themeId };
        try {
          let drawable, name: string, source: SlidePhoto["source"];
          if (ref.kind === "library") {
            const item = LIBRARY_PHOTOS.find((p) => p.id === ref.id);
            if (!item) throw new Error("Unknown library photo");
            drawable = await loadImage(item.src);
            name = item.label;
            source = { kind: "library", id: ref.id };
          } else {
            drawable = await loadDataUrl(ref.dataUrl);
            name = ref.name;
            source = { kind: "upload" };
          }
          return { id: newSlideId(), photo: { drawable, name, source }, photoSettings: s.photoSettings, caption: s.caption, themeId: s.themeId };
        } catch {
          allOk = false;
          return { id: newSlideId(), photo: null, photoSettings: s.photoSettings, caption: s.caption, themeId: s.themeId };
        }
      }),
    );
    setSlides(loaded.length >= MIN_SLIDES ? loaded : [...loaded, newSlide()]);
    setActiveIndex(0);
    return allOk;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const result = raw ? parseGalleryProject(raw) : null;
        if (result?.ok) await applyProject(result.project);
        else {
          const seeded = await exampleSlides();
          if (!cancelled) setSlides(seeded);
        }
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
      localStorage.setItem(STORAGE_KEY, serializeGalleryProject(currentProject(false)));
    } catch {
      // Ignore, see above.
    }
  }, [restored, currentProject]);

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

  // The caption template never draws the logo, so any theme's logo works here — it just satisfies the render API.
  useEffect(() => {
    let cancelled = false;
    loadImage(getTheme(DEFAULT_THEME_ID).logoSrc)
      .then((img) => {
        if (!cancelled) setLogo(img);
      })
      .catch(() => {
        if (!cancelled) setMessage("Could not load the logo.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Live preview of the active slide, redrawn on every change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !logo || !fontsReady) return;
    renderCollateral(canvas, {
      format: effectiveFormat,
      template: CAPTION_TEMPLATE,
      theme: activeTheme,
      values: { caption: activeSlide.caption },
      logo,
      photo: photo?.drawable ?? null,
      photoSettings,
      qrCodes: [],
      trackQr: false,
      maxSide: PREVIEW_MAX_SIDE,
    });
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !photo) return;
    const img = { w: photo.drawable.width, h: photo.drawable.height };
    const slideId = activeSlide.id;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const k = canvas.width / rect.width;
      const anchor = { x: (e.clientX - rect.left) * k, y: (e.clientY - rect.top) * k };
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const factor = Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015));
      updateSlide(slideId, (s) => ({
        photoSettings: { ...s.photoSettings, ...zoomPhoto(img, { w: canvas.width, h: canvas.height }, s.photoSettings, s.photoSettings.zoom * factor, anchor) },
      }));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [photo, activeSlide.id, updateSlide]);

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
    const slideId = activeSlide.id;
    if (pointers.current.size === 1) {
      updateSlide(slideId, (s) => ({ photoSettings: { ...s.photoSettings, ...panPhoto(img, box, s.photoSettings, (next.x - prev.x) * k, (next.y - prev.y) * k) } }));
    } else if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const rect = canvas.getBoundingClientRect();
      const mid = { x: ((a.x + b.x) / 2 - rect.left) * k, y: ((a.y + b.y) / 2 - rect.top) * k };
      const zoom = (pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.dist;
      updateSlide(slideId, (s) => ({ photoSettings: { ...s.photoSettings, ...zoomPhoto(img, box, s.photoSettings, zoom, mid) } }));
    }
  }

  function onPointerEnd(e: ReactPointerEvent<HTMLCanvasElement>) {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
  }

  /**
   * One photo replaces the current slide's. Several fill the current slide, then the later slides that have
   * no photo yet, then new slides up to the limit, one photo each.
   */
  async function onPhotos(files: File[]) {
    if (files.length === 0) return;
    setMessage(null);
    const loaded: SlidePhoto[] = [];
    let failed = 0;
    for (const file of files) {
      try {
        loaded.push({ drawable: await fileToDrawable(file), name: file.name, source: { kind: "upload" } });
      } catch {
        failed += 1;
      }
    }
    const withPhoto = (s: Slide, p: SlidePhoto): Slide => ({ ...s, photo: p, photoSettings: { ...DEFAULT_SLIDE_PHOTO_SETTINGS } });
    const queue = [...loaded];
    const next = slides.map((s, i) => {
      const takes = i === activeIndex || (i > activeIndex && !s.photo);
      return takes && queue.length ? withPhoto(s, queue.shift()!) : s;
    });
    while (queue.length && next.length < MAX_SLIDES) next.push(withPhoto(newSlide(), queue.shift()!));
    setSlides(next);
    const left = queue.length;
    if (failed || left) {
      setMessage(
        [failed && `${failed} ${failed === 1 ? "image" : "images"} could not be read.`, left && `${left} did not fit: a gallery holds ${MAX_SLIDES} slides.`]
          .filter(Boolean)
          .join(" "),
      );
    }
  }

  async function onLibraryPhoto(item: LibraryPhoto) {
    setMessage(null);
    try {
      const drawable = await loadImage(item.src);
      updateSlide(activeSlide.id, {
        photo: { drawable, name: item.label, source: { kind: "library", id: item.id } },
        photoSettings: { ...DEFAULT_SLIDE_PHOTO_SETTINGS },
      });
    } catch {
      setMessage("Could not load that photo.");
    }
  }

  function addSlide() {
    if (slides.length >= MAX_SLIDES) return;
    setSlides((prev) => [...prev, newSlide()]);
    setActiveIndex(slides.length);
  }

  function removeSlide(index: number) {
    if (slides.length <= MIN_SLIDES) return;
    setSlides((prev) => prev.filter((_, i) => i !== index));
    setActiveIndex((i) => Math.min(i, slides.length - 2));
  }

  function moveSlide(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= slides.length) return;
    setSlides((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setActiveIndex(target);
  }

  async function renderSlideCanvas(slide: Slide, fmt: Format, bleed: boolean): Promise<HTMLCanvasElement> {
    const canvas = document.createElement("canvas");
    renderCollateral(canvas, {
      format: fmt,
      template: CAPTION_TEMPLATE,
      theme: getTheme(slide.themeId),
      values: { caption: slide.caption },
      logo: logo!,
      photo: slide.photo?.drawable ?? null,
      photoSettings: slide.photoSettings,
      qrCodes: [],
      trackQr: false,
      bleed,
    });
    return canvas;
  }

  function togglePlatform(id: PlatformId) {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onDownloadForPlatforms() {
    if (!logo || platforms.size === 0) return;
    setBusy(true);
    setMessage(null);
    try {
      const groups: PlatformExportGroup[] = [];
      for (const variant of CAROUSEL_PLATFORMS) {
        if (!platforms.has(variant.platform)) continue;
        const fmt = getFormat(variant.formatId);
        const used = slides.slice(0, variant.maxSlides);
        const canvases = await Promise.all(used.map((s) => renderSlideCanvas(s, fmt, false)));
        if (variant.export === "images" || variant.export === "both") {
          const blobs = await Promise.all(canvases.map(canvasToPngBlob));
          groups.push({ folder: variant.platform, kind: "images", pngBlobs: blobs });
        }
        if (variant.export === "pdf" || variant.export === "both") {
          const bytes = await pdfBytesDigital(canvases);
          groups.push({ folder: variant.platform, kind: "pdf", pdfBytes: bytes, pdfName: exportFilename([variant.platform, "carousel"], "pdf") });
        }
      }
      await downloadPlatformBundleZip(groups, exportFilename(["gallery", "platforms"], "zip"));
    } catch {
      setMessage("Could not create the export. Try again, or with fewer slides.");
    } finally {
      setBusy(false);
    }
  }

  function onSaveProject() {
    setMessage(null);
    try {
      downloadText(serializeGalleryProject(currentProject(true)), exportFilename(["gallery", "project"], "json"), "application/json");
      setMessage("Project file saved. Open it from the ⋯ menu to carry on editing.");
    } catch {
      setMessage("Could not save the project.");
    }
  }

  async function onOpenProject(file: File | undefined) {
    if (!file) return;
    setMessage(null);
    if (file.size > MAX_PROJECT_FILE_BYTES) {
      setMessage("That file is too big to be a saved gallery.");
      return;
    }
    const result = parseGalleryProject(await file.text());
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    const ok = await applyProject(result.project);
    setMessage(ok ? `Opened ${file.name}.` : `Opened ${file.name}, but some photos could not be loaded.`);
  }

  async function onReset() {
    const before = { slides, activeIndex, platforms };
    const seeded = await exampleSlides();
    setSlides(seeded);
    setActiveIndex(0);
    setPlatforms(new Set(ALL_PLATFORM_IDS));
    setMessage(RESET_MESSAGE);
    setUndoReset(() => () => {
      setSlides(before.slides);
      setActiveIndex(before.activeIndex);
      setPlatforms(before.platforms);
      setUndoReset(null);
      setMessage(null);
    });
  }

  const ready = !busy && Boolean(logo) && fontsReady;

  return (
    <div className="collateral-studio">
      <div className="collateral-preview">
        <div className="collateral-preview-pin">
          <div className="collateral-preview-frame">
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={`Preview of slide ${activeIndex + 1} of ${slides.length}`}
              hidden={!logo || !fontsReady}
              className={photo ? "is-draggable" : undefined}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerEnd}
              onPointerCancel={onPointerEnd}
            />
            {(!logo || !fontsReady) && <p className="collateral-loading">Loading…</p>}
          </div>
          {logo && fontsReady && (
            <div className="collateral-filmstrip" role="group" aria-label="All slides">
              {slides.map((s, i) => (
                <SlideThumb
                  key={s.id}
                  slide={s}
                  format={effectiveFormat}
                  logo={logo}
                  index={i}
                  active={i === activeIndex}
                  onSelect={() => setActiveIndex(i)}
                />
              ))}
            </div>
          )}
        </div>
        <p className="collateral-preview-meta">
          Slide {activeIndex + 1} of {slides.length} ·{" "}
          {previewCrop ? `Crop for ${previewCrop.label} · ${formatDimensionLabel(effectiveFormat)}` : formatDimensionLabel(effectiveFormat)}
          {photo && " · Drag the photo to move it. Scroll or pinch to zoom."}
        </p>
        {previewCrops.length > 1 && (
          <div className="collateral-crop-picker" role="group" aria-label="Preview crop">
            {previewCrops.map((c) => (
              <button
                key={c.formatId}
                type="button"
                aria-pressed={c.formatId === previewCrop?.formatId}
                onClick={() => setPreviewFormatId(c.formatId)}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
        <div className="collateral-preview-actions">
          <button type="button" className="btn primary large" onClick={onDownloadForPlatforms} disabled={!ready || platforms.size === 0}>
            {busy ? "Preparing…" : "Download slides"}
          </button>
          <ProjectMenu noun="project" onSave={onSaveProject} onOpen={onOpenProject} onReset={onReset} saveDisabled={!restored} />
          {message && (
            <p className="collateral-message" role="status">
              {message}
              {message === RESET_MESSAGE && undoReset && (
                <button type="button" className="collateral-link" onClick={undoReset}>
                  Undo
                </button>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="collateral-controls">
        <section>
          <h2>1. Platforms</h2>
          <p className="collateral-hint">One download gives each platform its own crop.</p>
          <div className="collateral-choice-grid" role="group" aria-label="Platforms">
            {CAROUSEL_PLATFORMS.map((v) => {
              const checked = platforms.has(v.platform);
              const trimmed = slides.length > v.maxSlides;
              return (
                <label key={v.platform} className={`collateral-choice collateral-choice-checkbox${checked ? " is-checked" : ""}`}>
                  <span className="collateral-choice-head">
                    <input type="checkbox" checked={checked} onChange={() => togglePlatform(v.platform)} />
                    <strong>{v.label}</strong>
                  </span>
                  <span>
                    {v.note}
                    {trimmed && ` — only the first ${v.maxSlides} will be included`}
                  </span>
                </label>
              );
            })}
          </div>
          {platforms.size === 0 && <p className="collateral-hint">Pick at least one platform.</p>}
        </section>

        <section>
          <h2>
            2. Slide {activeIndex + 1} of {slides.length}
          </h2>
          <p className="collateral-hint">Pick a slide from the strip under the preview.</p>
          <div className="collateral-actions collateral-slide-actions">
            <button type="button" className="btn ghost small" disabled={activeIndex === 0} onClick={() => moveSlide(activeIndex, -1)}>
              ← Move earlier
            </button>
            <button type="button" className="btn ghost small" disabled={activeIndex === slides.length - 1} onClick={() => moveSlide(activeIndex, 1)}>
              Move later →
            </button>
            <button type="button" className="btn ghost small" disabled={slides.length <= MIN_SLIDES} onClick={() => removeSlide(activeIndex)}>
              Remove
            </button>
            <button type="button" className="btn ghost small" disabled={slides.length >= MAX_SLIDES} onClick={addSlide}>
              {`Add a slide (${slides.length} of ${MAX_SLIDES})`}
            </button>
          </div>
        </section>

        <section>
          <h2>3. Style</h2>
          <p className="collateral-hint">Each slide can have its own colour.</p>
          <StylePicker themeId={activeTheme.id} onTheme={(themeId) => updateSlide(activeSlide.id, { themeId })} />
        </section>

        <section>
          <h2>4. Caption</h2>
          <textarea
            id="gallery-caption"
            aria-label={`Caption for slide ${activeIndex + 1}`}
            rows={3}
            maxLength={CAPTION_MAX}
            value={activeSlide.caption}
            onChange={(e) => updateSlide(activeSlide.id, { caption: e.target.value })}
          />
          <CharCount value={activeSlide.caption} max={CAPTION_MAX} />
        </section>

        <section>
          <h2>5. Photo</h2>
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
          <p className="collateral-hint">Or upload your own. Pick several to fill a slide each:</p>
          <input
            type="file"
            accept="image/*"
            multiple
            aria-label="Upload photos"
            onChange={(e) => {
              // Copy the files before clearing the input, so picking the same files again still fires.
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              void onPhotos(files);
            }}
          />
          {photo && (
            <div className="collateral-photo-controls">
              <p className="collateral-hint">
                {photo.name} · stays in your browser
                <button type="button" className="collateral-link" onClick={() => updateSlide(activeSlide.id, { photo: null })}>
                  Remove
                </button>
              </p>
              <CropControls
                view={photoSettings}
                onChange={(patch) => updateSlide(activeSlide.id, (s) => ({ photoSettings: { ...s.photoSettings, ...patch } }))}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
