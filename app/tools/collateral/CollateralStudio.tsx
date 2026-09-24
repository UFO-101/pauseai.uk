"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CalendarEvent } from "@/lib/collateral/eventText";
import { downloadCanvasPdf, downloadCanvasPng, downloadText, exportFilename } from "@/lib/collateral/export";
import { BLEED_MM, DEFAULT_FORMAT_ID, FORMAT_GROUPS, FORMATS, formatDimensionLabel, getFormat, previewStyle, renderSize } from "@/lib/collateral/formats";
import QrFormatNote from "./QrFormatNote";
import { sameIssues, type LintIssue } from "@/lib/collateral/lint";
import type { PhotoView } from "@/lib/collateral/photoTransform";
import { parseProject, serializeProject, type Project } from "@/lib/collateral/project";
import { qrPlan, usableQrCodes } from "@/lib/collateral/qr";
import { renderCollateral, type RenderOptions } from "@/lib/collateral/render";
import { defaultValues, type Drawable } from "@/lib/collateral/templates";
import { CLEAR_PHOTO_LOGO_SRC, getTheme } from "@/lib/collateral/themes";
import Checks from "./Checks";
import CropControls from "./CropControls";
import PhotoTintControl from "./PhotoTintControl";
import DesignControls from "./DesignControls";
import { designFromData, designQrCodes, designTemplate, designToData, designValues, newDesign, withQrCodes, type DesignState } from "./designState";
import ProjectMenu from "./ProjectMenu";
import TitleSizeControl from "./TitleSizeControl";
import { usePhotoGestures } from "./usePhotoGestures";
import { useStudioAssets } from "./useStudioAssets";

const RESET_MESSAGE = "Reset to the example text.";
const STORAGE_KEY = "pauseai-collateral-v2";
const PREVIEW_MAX_SIDE = 1400;
const MAX_PROJECT_FILE_BYTES = 12_000_000;
const DEFAULT_VIEW: PhotoView = { zoom: 1, focalX: 0.5, focalY: 0.5 };
/** Checks that mean the title size nudge may help. */
const TITLE_ISSUES = ["text-overflow", "title-small"];

export default function CollateralStudio({ events }: { events: CalendarEvent[] }) {
  const [formatId, setFormatId] = useState(DEFAULT_FORMAT_ID);
  const [design, setDesign] = useState<DesignState>(() => newDesign());
  // A crop belongs to the photo it was set on, so a new photo starts centred and unzoomed.
  const [photoViewState, setPhotoViewState] = useState<{ photo: Drawable | null; view: PhotoView }>({ photo: null, view: DEFAULT_VIEW });
  const [headlineScale, setHeadlineScale] = useState(1);
  // QR codes on a screen format (social posts), where they are left out unless asked for.
  const [screenQr, setScreenQr] = useState(false);
  const [issues, setIssues] = useState<LintIssue[]>([]);
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Restores what the last Reset cleared. Only offered while the reset message is showing.
  const [undoReset, setUndoReset] = useState<(() => void) | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { fontsReady, logos, error: assetError } = useStudioAssets();

  const format = getFormat(formatId);
  const template = designTemplate(design);
  const theme = getTheme(design.themeId);
  const values = designValues(design);
  const logo = logos[theme.logoSrc] ?? null;
  const ready = !busy && Boolean(logo) && fontsReady;

  // Why QR codes are hidden or trimmed on this format, shown beside the codes.
  const exportSize = renderSize(format);
  const qrReason = qrPlan({
    width: exportSize.width,
    height: exportSize.height,
    dpi: exportSize.dpi,
    urls: usableQrCodes(designQrCodes(design)).map((c) => c.url),
    track: design.trackQr,
    sizePref: design.qrSize,
  }).reason;

  const update = useCallback((fn: (d: DesignState) => DesignState) => setDesign(fn), []);
  const currentPhoto = design.photo?.drawable ?? null;
  const photoView = photoViewState.photo === currentPhoto ? photoViewState.view : DEFAULT_VIEW;
  const setPhotoView = useCallback(
    (fn: (v: PhotoView) => PhotoView) =>
      setPhotoViewState((s) => ({ photo: currentPhoto, view: fn(s.photo === currentPhoto ? s.view : DEFAULT_VIEW) })),
    [currentPhoto],
  );
  const photoGestures = usePhotoGestures(canvasRef, currentPhoto, photoView, setPhotoView);

  const currentProject = useCallback(
    (embedUploads: boolean): Project => ({
      ...designToData(design, embedUploads),
      formatId,
      photoSettings: photoView,
      headlineScale,
      screenQr,
    }),
    [design, formatId, photoView, headlineScale, screenQr],
  );

  // Puts a saved or restored project on screen. Returns false if an image could not be loaded.
  const applyProject = useCallback(async (project: Project): Promise<boolean> => {
    const { design: loaded, ok } = await designFromData(project);
    setDesign(loaded);
    setFormatId(project.formatId);
    setHeadlineScale(project.headlineScale);
    setScreenQr(project.screenQr);
    const { zoom, focalX, focalY } = project.photoSettings;
    setPhotoViewState({ photo: loaded.photo?.drawable ?? null, view: { zoom, focalX, focalY } });
    return ok;
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

  // Autosave. Uploaded photos are not kept (too big for browser storage), library photos and partner logos are.
  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(STORAGE_KEY, serializeProject(currentProject(false)));
    } catch {
      // Ignore, see above.
    }
  }, [restored, currentProject]);

  function renderOptions(bleed: boolean): RenderOptions {
    return {
      format,
      template,
      theme,
      values,
      logo: logo!,
      photo: design.photo?.drawable ?? null,
      photoSettings: photoView,
      qrCodes: designQrCodes(design),
      trackQr: design.trackQr,
      qrSize: design.qrSize,
      photoClear: design.photoClear,
      clearPhotoLogo: logos[CLEAR_PHOTO_LOGO_SRC],
      screenQr,
      headlineScale,
      partnerLogos: design.partnerLogos.map((l) => l.drawable),
      bleed,
    };
  }

  // Live preview and its checks, redrawn on every change. No dependency list on purpose: it redraws after every
  // render, and setIssues only fires when the checks actually change, so it cannot loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !logo || !fontsReady) return;
    const { issues: found } = renderCollateral(canvas, { ...renderOptions(false), maxSide: PREVIEW_MAX_SIDE, lint: true });
    setIssues((prev) => (sameIssues(prev, found) ? prev : found));
  });

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
      downloadText(serializeProject(currentProject(true)), exportFilename([template.id, format.id, "project"], "json"), "application/json");
      setMessage("Project file saved. Open it from the ⋯ menu to carry on editing.");
    } catch {
      setMessage("Could not save the project.");
    }
  }

  async function onOpenProject(file: File | undefined) {
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
    const ok = await applyProject(result.project);
    setMessage(ok ? `Opened ${file.name}.` : `Opened ${file.name}, but an image in it could not be loaded.`);
  }

  function onReset() {
    const before = { design, photoViewState, headlineScale };
    setDesign((d) => ({
      ...withQrCodes(d, []),
      valuesByTemplate: { ...d.valuesByTemplate, [template.id]: defaultValues(template) },
      photo: null,
      partnerLogos: [],
    }));
    setHeadlineScale(1);
    setMessage(RESET_MESSAGE);
    setUndoReset(() => () => {
      setDesign(before.design);
      setHeadlineScale(before.headlineScale);
      setPhotoViewState(before.photoViewState);
      setUndoReset(null);
      setMessage(null);
    });
  }

  const titleFlagged = issues.some((i) => TITLE_ISSUES.includes(i.id));
  const shown = message ?? assetError;

  return (
    <div className="collateral-studio">
      <div className="collateral-preview">
        <div className="collateral-preview-frame">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Preview of ${format.label}`}
            hidden={!logo || !fontsReady}
            style={previewStyle(format)}
            className={design.photo ? "is-draggable" : undefined}
            {...photoGestures}
          />
          {(!logo || !fontsReady) && <p className="collateral-loading">Loading…</p>}
        </div>
        <p className="collateral-preview-meta">
          {format.label} · {formatDimensionLabel(format)}
          {design.photo && " · Drag the photo to move it. Scroll or pinch to zoom."}
        </p>
        <div className="collateral-preview-actions">
          <Checks issues={issues} />
          <button type="button" className="btn primary large" onClick={onDownloadPng} disabled={!ready}>
            {busy ? "Preparing…" : "Download PNG"}
          </button>
          {format.kind === "print" && (
            <button type="button" className="btn primary large" onClick={onDownloadPdf} disabled={!ready}>
              {busy ? "Preparing…" : `Download print PDF (+${BLEED_MM} mm bleed)`}
            </button>
          )}
          <ProjectMenu noun="project" onSave={onSaveProject} onOpen={onOpenProject} onReset={onReset} saveDisabled={!restored} />
          {shown && (
            <p className="collateral-message" role="status">
              {shown}
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
          {format.note && <p className="collateral-hint">{format.note}</p>}
        </section>

        <DesignControls
          design={design}
          update={update}
          events={events}
          firstSection={2}
          qrNote={<QrFormatNote format={format} screenQr={screenQr} onScreenQr={setScreenQr} reason={qrReason} />}
          onQrAdded={() => setScreenQr(true)}
          onMessage={setMessage}
          headlineExtras={<TitleSizeControl value={headlineScale} onChange={setHeadlineScale} flagged={titleFlagged} />}
          photoExtras={
            <>
              {format.kind === "digital" && format.logoCover && (
                <PhotoTintControl clear={design.photoClear} onChange={(photoClear) => update((d) => ({ ...d, photoClear }))} />
              )}
              <CropControls view={photoView} onChange={(patch) => setPhotoView((v) => ({ ...v, ...patch }))} />
            </>
          }
        />
      </div>
    </div>
  );
}
