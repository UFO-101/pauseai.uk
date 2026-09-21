import { getFormat } from "./formats";
import { LIBRARY_PHOTOS } from "./photos";
import { MAX_ZOOM } from "./photoTransform";
import { MAX_QR_CODES, type QrCode } from "./qr";
import { TEMPLATES, getTemplate, type PhotoSettings, type Values } from "./templates";
import { getTheme } from "./themes";

export const PROJECT_APP = "pauseai-collateral";
export const PROJECT_VERSION = 1;
export const QR_LABEL_MAX = 32;
export const QR_URL_MAX = 200;
/** Uploaded photos are embedded in the file, so cap what a file may carry. */
export const MAX_EMBEDDED_PHOTO_CHARS = 8_000_000;

export type ProjectPhoto =
  | { kind: "library"; id: string }
  | { kind: "upload"; name: string; dataUrl: string };

/** Everything needed to reopen a design. Plain data, so it can be saved as JSON. */
export interface Project {
  formatId: string;
  templateId: string;
  themeId: string;
  /** Text fields, kept per layout so switching layouts does not lose what was typed. */
  values: Record<string, Values>;
  qrCodes: QrCode[];
  trackQr: boolean;
  photo: ProjectPhoto | null;
  photoSettings: PhotoSettings;
}

export function serializeProject(project: Project, now = new Date()): string {
  return JSON.stringify({ app: PROJECT_APP, version: PROJECT_VERSION, savedAt: now.toISOString(), ...project }, null, 2);
}

export type ParseResult = { ok: true; project: Project } | { ok: false; error: string };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number): string => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown, lo: number, hi: number, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;

/**
 * Reads a saved file. It is deliberately forgiving about content (unknown ids fall back to
 * defaults, long text is trimmed) and strict about shape, since the file is untrusted input.
 */
export function parseProject(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file is not a saved collateral project." };
  }
  if (!isRecord(raw) || raw.app !== PROJECT_APP) {
    return { ok: false, error: "That file is not a saved collateral project." };
  }
  if (typeof raw.version !== "number" || raw.version > PROJECT_VERSION) {
    return { ok: false, error: "This project was saved by a newer version of the tool." };
  }

  const values: Record<string, Values> = {};
  const rawValues = isRecord(raw.values) ? raw.values : {};
  for (const template of TEMPLATES) {
    const saved = rawValues[template.id];
    if (!isRecord(saved)) continue;
    values[template.id] = Object.fromEntries(
      template.fields.filter((f) => typeof saved[f.key] === "string").map((f) => [f.key, str(saved[f.key], f.maxLength ?? 200)]),
    );
  }

  const qrCodes: QrCode[] = Array.isArray(raw.qrCodes)
    ? raw.qrCodes
        .filter(isRecord)
        .slice(0, MAX_QR_CODES)
        .map((c) => ({ label: str(c.label, QR_LABEL_MAX), url: str(c.url, QR_URL_MAX) }))
    : [];

  const rawPhoto = isRecord(raw.photo) ? raw.photo : null;
  let photo: ProjectPhoto | null = null;
  if (rawPhoto?.kind === "library" && LIBRARY_PHOTOS.some((p) => p.id === rawPhoto.id)) {
    photo = { kind: "library", id: rawPhoto.id as string };
  } else if (
    rawPhoto?.kind === "upload" &&
    typeof rawPhoto.dataUrl === "string" &&
    // Raster formats only. SVG data URLs are not accepted.
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(rawPhoto.dataUrl) &&
    rawPhoto.dataUrl.length <= MAX_EMBEDDED_PHOTO_CHARS
  ) {
    photo = { kind: "upload", name: str(rawPhoto.name, 120) || "Uploaded photo", dataUrl: rawPhoto.dataUrl };
  }

  const ps = isRecord(raw.photoSettings) ? raw.photoSettings : {};
  return {
    ok: true,
    project: {
      formatId: getFormat(str(raw.formatId, 40)).id,
      templateId: getTemplate(str(raw.templateId, 40)).id,
      themeId: getTheme(str(raw.themeId, 40)).id,
      values,
      qrCodes,
      // Off unless a file explicitly turns it on. Tagging is currently disabled in qrTarget anyway.
      trackQr: raw.trackQr === true,
      photo,
      photoSettings: {
        zoom: num(ps.zoom, 1, MAX_ZOOM, 1),
        focalX: num(ps.focalX, 0, 1, 0.5),
        focalY: num(ps.focalY, 0, 1, 0.5),
        visible: num(ps.visible, 0.1, 0.7, 0.25),
      },
    },
  };
}
