import type { QrSize } from "@/lib/collateral/design";
import { LIBRARY_PHOTOS } from "@/lib/collateral/photos";
import type { DesignData, PartnerLogoData, ProjectPhoto } from "@/lib/collateral/project";
import type { QrCode } from "@/lib/collateral/qr";
import { drawableToJpegDataUrl, loadDataUrl, loadImage } from "@/lib/collateral/render";
import { DEFAULT_TEMPLATE_ID, defaultValues, getTemplate, TEMPLATES, type Drawable, type Template, type Values } from "@/lib/collateral/templates";
import { DEFAULT_THEME_ID } from "@/lib/collateral/themes";

// Caption is a gallery slide (photo-forward, no logo), so single designs offer the other layouts and point to the gallery.
// Brush is suspended for now: its code stays in templates.ts so it can come back.
const HIDDEN_TEMPLATE_IDS = ["caption", "brush"];
// Event goes last, so "fill in from one of our events" can sit right under it (see DesignControls).
export const DESIGN_TEMPLATES = TEMPLATES.filter((t) => !HIDDEN_TEMPLATE_IDS.includes(t.id)).sort(
  (a, b) => Number(a.id === "event") - Number(b.id === "event"),
);

export interface PhotoState {
  drawable: Drawable;
  name: string;
  source: { kind: "library"; id: string } | { kind: "upload" };
}

export interface PartnerLogoState extends PartnerLogoData {
  drawable: Drawable;
}

/** A design as the editor holds it: DesignData with images loaded. Shared by Single image and Campaign pack. */
export interface DesignState {
  templateId: string;
  themeId: string;
  valuesByTemplate: Record<string, Values>;
  /** QR codes per layout, like the text. Read and write the current layout's with designQrCodes and withQrCodes. */
  qrCodesByTemplate: Record<string, QrCode[]>;
  trackQr: boolean;
  qrSize: QrSize;
  photo: PhotoState | null;
  /** See DesignData.photoClear. */
  photoClear: boolean;
  partnerLogos: PartnerLogoState[];
}

export function newDesign(templateId = DEFAULT_TEMPLATE_ID): DesignState {
  return {
    templateId,
    themeId: DEFAULT_THEME_ID,
    valuesByTemplate: {},
    qrCodesByTemplate: {},
    trackQr: false,
    qrSize: "m",
    photo: null,
    photoClear: false,
    partnerLogos: [],
  };
}

/** The design's layout. Older saves may still name a hidden layout (Caption, Brush), so fall back to the default. */
export function designTemplate(design: DesignState): Template {
  return DESIGN_TEMPLATES.find((t) => t.id === design.templateId) ?? getTemplate(DEFAULT_TEMPLATE_ID);
}

/** The current layout's text, merged over its defaults so fields added after a volunteer's last visit still get a value. */
export function designValues(design: DesignState): Values {
  const template = designTemplate(design);
  return { ...defaultValues(template), ...design.valuesByTemplate[template.id] };
}

/** The current layout's QR codes. */
export function designQrCodes(design: DesignState): QrCode[] {
  return design.qrCodesByTemplate[designTemplate(design).id] ?? [];
}

/** The design with the current layout's QR codes replaced. */
export function withQrCodes(design: DesignState, qrCodes: QrCode[]): DesignState {
  return { ...design, qrCodesByTemplate: { ...design.qrCodesByTemplate, [designTemplate(design).id]: qrCodes } };
}

/**
 * Plain data for saving. Uploaded photos are embedded only when `embedUploads` is set: project files carry them,
 * browser autosave does not (too big). Partner logos are small once downscaled, so both keep them.
 */
export function designToData(design: DesignState, embedUploads: boolean): DesignData {
  let photo: ProjectPhoto | null = null;
  if (design.photo?.source.kind === "library") photo = { kind: "library", id: design.photo.source.id };
  else if (design.photo && embedUploads) photo = { kind: "upload", name: design.photo.name, dataUrl: drawableToJpegDataUrl(design.photo.drawable) };
  return {
    templateId: design.templateId,
    themeId: design.themeId,
    values: design.valuesByTemplate,
    qrCodes: design.qrCodesByTemplate,
    trackQr: design.trackQr,
    qrSize: design.qrSize,
    photo,
    photoClear: design.photoClear,
    partnerLogos: design.partnerLogos.map(({ name, dataUrl }) => ({ name, dataUrl })),
  };
}

/** Loads a saved design's images. `ok` is false when the photo or a partner logo could not be loaded. */
export async function designFromData(data: DesignData): Promise<{ design: DesignState; ok: boolean }> {
  let ok = true;
  let photo: PhotoState | null = null;
  if (data.photo) {
    try {
      if (data.photo.kind === "library") {
        const id = data.photo.id;
        const item = LIBRARY_PHOTOS.find((p) => p.id === id);
        if (!item) throw new Error("Unknown library photo");
        photo = { drawable: await loadImage(item.src), name: item.label, source: { kind: "library", id } };
      } else {
        photo = { drawable: await loadDataUrl(data.photo.dataUrl), name: data.photo.name, source: { kind: "upload" } };
      }
    } catch {
      ok = false;
    }
  }
  const partnerLogos: PartnerLogoState[] = [];
  for (const logo of data.partnerLogos) {
    try {
      partnerLogos.push({ ...logo, drawable: await loadDataUrl(logo.dataUrl) });
    } catch {
      ok = false;
    }
  }
  return {
    ok,
    design: {
      templateId: data.templateId,
      themeId: data.themeId,
      valuesByTemplate: data.values,
      qrCodesByTemplate: data.qrCodes,
      trackQr: data.trackQr,
      qrSize: data.qrSize,
      photo,
      photoClear: data.photoClear,
      partnerLogos,
    },
  };
}
