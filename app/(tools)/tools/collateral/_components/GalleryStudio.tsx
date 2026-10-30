"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import type { PhotoView } from "@/lib/collateral/photoTransform";
import { ALL_PLATFORM_IDS, CAROUSEL_PLATFORMS, type PlatformId } from "@/lib/collateral/platforms";
import type { ProjectPhoto } from "@/lib/collateral/project";
import {
  drawableToJpegDataUrl,
  fileToDrawable,
  loadDataUrl,
  loadFonts,
  loadImage,
  renderCollateral,
} from "@/lib/collateral/render";
import { getTemplate, type Drawable } from "@/lib/collateral/templates";
import { DEFAULT_THEME_ID, getTheme } from "@/lib/collateral/themes";
import CharCount from "./CharCount";
import CropControls from "./CropControls";
import ProjectMenu from "./ProjectMenu";
import StylePicker from "./StylePicker";
import { usePhotoGestures } from "./usePhotoGestures";
import { CheckboxChoice, ChoiceGrid, PhotoLibrary } from "@/components/tools/kit/Choices";
import { Button } from "@/components/ui/Button";
import { FileInput, TextArea } from "@/components/ui/Controls";
import { Hint } from "@/components/ui/Field";
import LinkButton from "@/components/ui/LinkButton";
import StatusMessage from "@/components/ui/StatusMessage";
import {
  ControlsColumn,
  ControlsSection,
  DownloadButton,
  PreviewActions,
  PreviewCanvas,
  PreviewColumn,
  PreviewMeta,
  PreviewPin,
  Studio,
} from "@/components/tools/kit/Studio";
import styles from "./GalleryStudio.module.css";

const CAPTION_TEMPLATE = getTemplate("caption");
const STORAGE_KEY = "pauseai-collateral-gallery-v1";
const PREVIEW_MAX_SIDE = 1400;
const THUMB_MAX_SIDE = 160;
const MAX_PROJECT_FILE_BYTES = 12_000_000 * MAX_SLIDES;
const RESET_MESSAGE = "Started a new gallery.";

/** Slide 1 filled in with an example, slide 2 empty. Falls back to two empty slides if the photo will not load. */
async function exampleSlides(): Promise<Slide[]> {
  // gallery.test.ts checks the example photo is in the library.
  const item = LIBRARY_PHOTOS.find((p) => p.id === EXAMPLE_SLIDE.photoId)!;
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
    renderCollateral(ref.current!, {
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
    <button
      type="button"
      className={styles.thumb}
      aria-label={`Show slide ${index + 1}`}
      aria-current={active}
      onClick={onSelect}
    >
      <canvas ref={ref} className={styles.thumbCanvas} aria-hidden="true" />
      <span className={styles.number}>{index + 1}</span>
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

  const previewCrops: PreviewCrop[] = [];
  for (const v of CAROUSEL_PLATFORMS) {
    if (!platforms.has(v.platform)) continue;
    const crop = previewCrops.find((c) => c.formatId === v.formatId);
    if (crop) crop.label += ` · ${v.label}`;
    else previewCrops.push({ formatId: v.formatId, label: v.label });
  }
  const previewCrop = previewCrops.find((c) => c.formatId === previewFormatId) ?? previewCrops[0];
  const effectiveFormat = getFormat(previewCrop?.formatId ?? DEFAULT_FORMAT_ID);
  const activeSlide = slides[Math.min(activeIndex, slides.length - 1)];
  const activeTheme = getTheme(activeSlide.themeId);
  const photo = activeSlide.photo;
  const photoSettings = activeSlide.photoSettings;

  const updateSlide = useCallback((id: string, patch: Partial<Slide> | ((s: Slide) => Partial<Slide>)) => {
    setSlides((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...(typeof patch === "function" ? patch(s) : patch) } : s)),
    );
  }, []);

  const projectPhoto = (p: SlidePhoto | null, embed: boolean): ProjectPhoto | null => {
    if (!p) return null;
    if (p.source.kind === "library") return { kind: "library", id: p.source.id };
    return embed ? { kind: "upload", name: p.name, dataUrl: drawableToJpegDataUrl(p.drawable) } : null;
  };

  const currentProject = useCallback(
    (embed: boolean): GalleryProject => ({
      slides: slides.map((s): GallerySlideData => ({
        photo: projectPhoto(s.photo, embed),
        photoSettings: s.photoSettings,
        caption: s.caption,
        themeId: s.themeId,
      })),
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
        if (!ref)
          return {
            id: newSlideId(),
            photo: null,
            photoSettings: s.photoSettings,
            caption: s.caption,
            themeId: s.themeId,
          };
        try {
          let drawable, name: string, source: SlidePhoto["source"];
          if (ref.kind === "library") {
            // parseGalleryProject only accepts ids in the library.
            const item = LIBRARY_PHOTOS.find((p) => p.id === ref.id)!;
            drawable = await loadImage(item.src);
            name = item.label;
            source = { kind: "library", id: ref.id };
          } else {
            drawable = await loadDataUrl(ref.dataUrl);
            name = ref.name;
            source = { kind: "upload" };
          }
          return {
            id: newSlideId(),
            photo: { drawable, name, source },
            photoSettings: s.photoSettings,
            caption: s.caption,
            themeId: s.themeId,
          };
        } catch {
          allOk = false;
          return {
            id: newSlideId(),
            photo: null,
            photoSettings: s.photoSettings,
            caption: s.caption,
            themeId: s.themeId,
          };
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

  // Drag, pinch and scroll the photo on the preview, for the active slide.
  const setPhotoView = (fn: (v: PhotoView) => PhotoView) =>
    updateSlide(activeSlide.id, (s) => ({ photoSettings: { ...s.photoSettings, ...fn(s.photoSettings) } }));
  const photoGestures = usePhotoGestures(canvasRef, photo?.drawable ?? null, photoSettings, setPhotoView);

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
    const withPhoto = (s: Slide, p: SlidePhoto): Slide => ({
      ...s,
      photo: p,
      photoSettings: { ...DEFAULT_SLIDE_PHOTO_SETTINGS },
    });
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
        [
          failed && `${failed} ${failed === 1 ? "image" : "images"} could not be read.`,
          left && `${left} did not fit: a gallery holds ${MAX_SLIDES} slides.`,
        ]
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

  // The slide buttons below are disabled at the limits, so these never go past them.
  function addSlide() {
    setSlides((prev) => [...prev, newSlide()]);
    setActiveIndex(slides.length);
  }

  function removeSlide(index: number) {
    setSlides((prev) => prev.filter((_, i) => i !== index));
    setActiveIndex((i) => Math.min(i, slides.length - 2));
  }

  function moveSlide(index: number, dir: -1 | 1) {
    const target = index + dir;
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

  // The download button is disabled until the logo and fonts have loaded, and while no platform is ticked.
  async function onDownloadForPlatforms() {
    setBusy(true);
    setMessage(null);
    try {
      const groups: PlatformExportGroup[] = [];
      for (const variant of CAROUSEL_PLATFORMS) {
        if (!platforms.has(variant.platform)) continue;
        const fmt = getFormat(variant.formatId);
        const used = slides.slice(0, variant.maxSlides);
        const canvases = await Promise.all(used.map((s) => renderSlideCanvas(s, fmt, false)));
        const blobs = await Promise.all(canvases.map(canvasToPngBlob));
        groups.push({ folder: variant.platform, kind: "images", pngBlobs: blobs });
        if (variant.export === "both") {
          const bytes = await pdfBytesDigital(canvases);
          groups.push({
            folder: variant.platform,
            kind: "pdf",
            pdfBytes: bytes,
            pdfName: exportFilename([variant.platform, "carousel"], "pdf"),
          });
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
      downloadText(
        serializeGalleryProject(currentProject(true)),
        exportFilename(["gallery", "project"], "json"),
        "application/json",
      );
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
    <Studio>
      <PreviewColumn>
        <PreviewPin>
          <PreviewCanvas
            canvasRef={canvasRef}
            label={`Preview of slide ${activeIndex + 1} of ${slides.length}`}
            ready={Boolean(logo) && fontsReady}
            draggable={Boolean(photo)}
            gestures={photoGestures}
          />
          {logo && fontsReady && (
            <div className={styles.filmstrip} role="group" aria-label="All slides">
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
        </PreviewPin>
        <PreviewMeta>
          Slide {activeIndex + 1} of {slides.length} ·{" "}
          {previewCrop
            ? `Crop for ${previewCrop.label} · ${formatDimensionLabel(effectiveFormat)}`
            : formatDimensionLabel(effectiveFormat)}
          {photo && " · Drag the photo to move it. Scroll or pinch to zoom."}
        </PreviewMeta>
        {previewCrops.length > 1 && (
          <div className={styles.cropPicker} role="group" aria-label="Preview crop">
            {previewCrops.map((c) => (
              <button
                key={c.formatId}
                type="button"
                className={styles.crop}
                aria-pressed={c.formatId === previewCrop!.formatId}
                onClick={() => setPreviewFormatId(c.formatId)}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
        <PreviewActions>
          <DownloadButton onClick={onDownloadForPlatforms} disabled={!ready || platforms.size === 0} pending={busy}>
            Download slides
          </DownloadButton>
          <ProjectMenu
            noun="project"
            onSave={onSaveProject}
            onOpen={onOpenProject}
            onReset={onReset}
            saveDisabled={!restored}
          />
          {message && <StatusMessage onUndo={message === RESET_MESSAGE ? undoReset : null}>{message}</StatusMessage>}
        </PreviewActions>
      </PreviewColumn>

      <ControlsColumn>
        <ControlsSection heading="1. Platforms">
          <Hint>One download gives each platform its own crop.</Hint>
          <ChoiceGrid role="group" label="Platforms">
            {CAROUSEL_PLATFORMS.map((v) => (
              <CheckboxChoice
                key={v.platform}
                checked={platforms.has(v.platform)}
                onChange={() => togglePlatform(v.platform)}
                title={v.label}
                note={
                  <>
                    {v.note}
                    {slides.length > v.maxSlides && ` — only the first ${v.maxSlides} will be included`}
                  </>
                }
              />
            ))}
          </ChoiceGrid>
          {platforms.size === 0 && <Hint>Pick at least one platform.</Hint>}
        </ControlsSection>

        <ControlsSection
          heading={
            <>
              2. Slide {activeIndex + 1} of {slides.length}
            </>
          }
        >
          <Hint>Pick a slide from the strip under the preview.</Hint>
          <div className={styles.slideActions}>
            <Button
              type="button"
              variant="ghost"
              size="small"
              disabled={activeIndex === 0}
              onClick={() => moveSlide(activeIndex, -1)}
            >
              ← Move earlier
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="small"
              disabled={activeIndex === slides.length - 1}
              onClick={() => moveSlide(activeIndex, 1)}
            >
              Move later →
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="small"
              disabled={slides.length <= MIN_SLIDES}
              onClick={() => removeSlide(activeIndex)}
            >
              Remove
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="small"
              disabled={slides.length >= MAX_SLIDES}
              onClick={addSlide}
            >
              {`Add a slide (${slides.length} of ${MAX_SLIDES})`}
            </Button>
          </div>
        </ControlsSection>

        <ControlsSection heading="3. Style">
          <Hint>Each slide can have its own colour.</Hint>
          <StylePicker themeId={activeTheme.id} onTheme={(themeId) => updateSlide(activeSlide.id, { themeId })} />
        </ControlsSection>

        <ControlsSection heading="4. Caption">
          <TextArea
            id="gallery-caption"
            aria-label={`Caption for slide ${activeIndex + 1}`}
            rows={3}
            maxLength={CAPTION_MAX}
            value={activeSlide.caption}
            onChange={(e) => updateSlide(activeSlide.id, { caption: e.target.value })}
          />
          <CharCount value={activeSlide.caption} max={CAPTION_MAX} />
        </ControlsSection>

        <ControlsSection heading="5. Photo">
          <PhotoLibrary current={photo?.source} onPick={onLibraryPhoto} />
          <Hint>Or upload your own. Pick several to fill a slide each:</Hint>
          <FileInput
            accept="image/*"
            multiple
            aria-label="Upload photos"
            onChange={(e) => {
              // Copy the files before clearing the input, so picking the same files again still fires.
              const files = Array.from(e.target.files!);
              e.target.value = "";
              void onPhotos(files);
            }}
          />
          {photo && (
            <div>
              <Hint>
                {photo.name} · stays in your browser
                <LinkButton onClick={() => updateSlide(activeSlide.id, { photo: null })}>Remove</LinkButton>
              </Hint>
              <CropControls
                view={photoSettings}
                onChange={(patch) =>
                  updateSlide(activeSlide.id, (s) => ({ photoSettings: { ...s.photoSettings, ...patch } }))
                }
              />
            </div>
          )}
        </ControlsSection>
      </ControlsColumn>
    </Studio>
  );
}
