"use client";

import type { ReactNode } from "react";
import { MAX_PARTNER_LOGOS, QR_SIZES } from "@/lib/collateral/design";
import { eventDayLabel, eventFieldValues, eventLink, type CalendarEvent } from "@/lib/collateral/eventText";
import { isLumaEventLink } from "@/lib/collateral/lint";
import { LIBRARY_PHOTOS, type LibraryPhoto } from "@/lib/collateral/photos";
import { QR_LABEL_MAX, QR_URL_MAX } from "@/lib/collateral/project";
import { MAX_QR_CODES, normaliseUrl, type QrCode } from "@/lib/collateral/qr";
import { drawableToPngDataUrl, fileToDrawable, loadDataUrl, loadImage } from "@/lib/collateral/render";
import { defaultValues, getTemplate } from "@/lib/collateral/templates";
import CharCount from "./CharCount";
import StylePicker from "./StylePicker";
import { DESIGN_TEMPLATES, designQrCodes, designTemplate, designValues, withQrCodes, type DesignState } from "./designState";

interface Props {
  design: DesignState;
  update: (fn: (d: DesignState) => DesignState) => void;
  /** Upcoming events from our calendar, for "fill in from an event". */
  events: CalendarEvent[];
  /** Number of the first section here, since each studio puts its own sections before or after. */
  firstSection: number;
  /** Extra photo controls from the studio, e.g. fine crop controls. */
  photoExtras?: ReactNode;
  /** Shown under the headline field, e.g. the title size nudge. */
  headlineExtras?: ReactNode;
  /** Shown under the QR codes when there are some: e.g. whether they show on the current format, and why. */
  qrNote?: ReactNode;
  /** Called when a volunteer adds a QR code, e.g. to show codes on a format that leaves them out by default. */
  onQrAdded?: () => void;
  onMessage: (message: string | null) => void;
}

const sameUrl = (a: string, b: string) => normaliseUrl(a).toLowerCase() === normaliseUrl(b).toLowerCase();

/** Layout, style, text, QR codes, photo and partner logos: everything about a design except its format. */
export default function DesignControls({ design, update, events, firstSection, photoExtras, headlineExtras, qrNote, onQrAdded, onMessage }: Props) {
  const template = designTemplate(design);
  const values = designValues(design);
  const qrCodes = designQrCodes(design);
  const n = (i: number) => firstSection + i;

  function setValue(key: string, value: string) {
    update((d) => ({ ...d, valuesByTemplate: { ...d.valuesByTemplate, [template.id]: { ...designValues(d), [key]: value } } }));
  }

  function importEvent(id: string) {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    const filled = eventFieldValues(ev);
    const link = eventLink(ev);
    update((d) => {
      const before = { ...defaultValues(getTemplate("event")), ...d.valuesByTemplate.event };
      // The first QR code opens the event itself, replacing any code for the old address or an earlier imported event.
      const current = d.qrCodesByTemplate.event ?? [];
      const replaced = current.filter((c) => (before.url && sameUrl(c.url, before.url)) || isLumaEventLink(c.url));
      const others = current.filter((c) => !replaced.includes(c));
      const codes = [{ label: replaced[0]?.label || "Scan to RSVP", url: link }, ...others].slice(0, MAX_QR_CODES);
      const event = { ...before, ...filled, group: filled.group || before.group };
      return {
        ...d,
        templateId: "event",
        valuesByTemplate: { ...d.valuesByTemplate, event },
        qrCodesByTemplate: { ...d.qrCodesByTemplate, event: codes },
      };
    });
    onMessage(
      `Filled in from “${ev.name}” with the Event layout. The QR code opens the event, and the printed link is our events page. Check the text before you download.`,
    );
  }

  // The first code opens the design's own web address, since that is almost always where it should go.
  // Later codes start blank, so two codes never quietly point at the same place.
  function newQr(): QrCode {
    if (qrCodes.length > 0) return { label: "", url: "" };
    return { label: template.id === "event" ? "Scan to RSVP" : "Scan to join", url: values.url?.trim() || "pauseai.uk" };
  }

  function updateQr(index: number, patch: Partial<QrCode>) {
    update((d) => withQrCodes(d, designQrCodes(d).map((c, i) => (i === index ? { ...c, ...patch } : c))));
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    onMessage(null);
    try {
      const drawable = await fileToDrawable(file);
      update((d) => ({ ...d, photo: { drawable, name: file.name, source: { kind: "upload" } } }));
    } catch {
      onMessage("Could not read that image. Try a JPG or PNG.");
    }
  }

  async function onLibraryPhoto(item: LibraryPhoto) {
    onMessage(null);
    try {
      const drawable = await loadImage(item.src);
      update((d) => ({ ...d, photo: { drawable, name: item.label, source: { kind: "library", id: item.id } } }));
    } catch {
      onMessage("Could not load that photo.");
    }
  }

  async function onPartnerLogo(file: File | undefined) {
    if (!file) return;
    onMessage(null);
    try {
      // Downscaled and re-encoded as PNG, so it stays small enough to save with the project and keeps transparency.
      const dataUrl = drawableToPngDataUrl(await fileToDrawable(file));
      const drawable = await loadDataUrl(dataUrl);
      update((d) => ({ ...d, partnerLogos: [...d.partnerLogos, { name: file.name, dataUrl, drawable }].slice(0, MAX_PARTNER_LOGOS) }));
    } catch {
      onMessage("Could not read that logo. Try a PNG with a transparent background.");
    }
  }

  return (
    <>
      <section>
        <h2>{n(0)}. Layout</h2>
        <div className="collateral-choice-grid" role="radiogroup" aria-label="Layout">
          {DESIGN_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={t.id === template.id}
              className="collateral-choice"
              onClick={() => update((d) => ({ ...d, templateId: t.id }))}
            >
              <strong>{t.label}</strong>
              <span>{t.description}</span>
            </button>
          ))}
        </div>
        {/* Right under the Event card, which is last in the list. Kept outside the radio group, which may only hold its options. */}
        {events.length > 0 && (
          <div className={`collateral-event-import${template.id === "event" ? " is-active" : ""}`}>
            <label className="collateral-label" htmlFor="collateral-import-event">
              Start from one of our events
            </label>
            <select id="collateral-import-event" value="" onChange={(e) => importEvent(e.target.value)}>
              <option value="">Choose an event…</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {eventDayLabel(ev)} · {ev.name}
                </option>
              ))}
            </select>
            <p className="collateral-hint">Fills in the Event layout, and adds a QR code for the event.</p>
          </div>
        )}
      </section>

      <section>
        <h2>{n(1)}. Style</h2>
        <StylePicker themeId={design.themeId} onTheme={(themeId) => update((d) => ({ ...d, themeId }))} />
      </section>

      <section>
        <h2>{n(2)}. Text</h2>
        {template.fields.map((field) => {
          const id = `collateral-${template.id}-${field.key}`;
          const value = values[field.key] ?? "";
          if (field.kind === "toggle") {
            return (
              <label key={field.key} className="collateral-toggle" htmlFor={id}>
                <input id={id} type="checkbox" checked={value === "true"} onChange={(e) => setValue(field.key, e.target.checked ? "true" : "false")} />
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
                <textarea id={id} rows={2} maxLength={field.maxLength} value={value} onChange={(e) => setValue(field.key, e.target.value)} />
              ) : field.kind === "date" || field.kind === "time" ? (
                <input id={id} type={field.kind} value={value} onChange={(e) => setValue(field.key, e.target.value)} />
              ) : (
                <input id={id} type="text" maxLength={field.maxLength} value={value} onChange={(e) => setValue(field.key, e.target.value)} />
              )}
              <CharCount value={value} max={field.maxLength} />
              {field.key === "headline" && headlineExtras}
            </div>
          );
        })}
      </section>

      <section>
        <h2>{n(3)}. QR codes (optional)</h2>
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
              <CharCount value={code.url} max={QR_URL_MAX} />
            </div>
            <button
              type="button"
              className="collateral-qr-remove"
              aria-label={`Remove QR code ${i + 1}`}
              onClick={() => update((d) => withQrCodes(d, designQrCodes(d).filter((_, j) => j !== i)))}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn ghost small"
          disabled={qrCodes.length >= MAX_QR_CODES}
          onClick={() => {
            const code = newQr();
            update((d) => withQrCodes(d, [...designQrCodes(d), code]));
            onQrAdded?.();
          }}
        >
          {qrCodes.length === 0 ? "Add a QR code" : `Add another (${qrCodes.length} of ${MAX_QR_CODES})`}
        </button>
        {qrCodes.length > 0 && (
          <>
            <span className="collateral-label collateral-qr-size-label">Size</span>
            <div className="collateral-segmented" role="radiogroup" aria-label="QR code size">
              {QR_SIZES.map((s) => (
                <button key={s.id} type="button" role="radio" aria-checked={design.qrSize === s.id} onClick={() => update((d) => ({ ...d, qrSize: s.id }))}>
                  {s.label}
                </button>
              ))}
            </div>
          </>
        )}
        {/* UTM tagging is switched off until we have a way to read the results. See qrTarget in lib/collateral/qr.ts. */}
        {qrCodes.length > 0 && qrNote}
      </section>

      <section>
        <h2>{n(4)}. Photo (optional)</h2>
        <div className="collateral-photo-grid">
          {LIBRARY_PHOTOS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="collateral-photo-thumb"
              aria-label={item.label}
              aria-pressed={design.photo?.source.kind === "library" && design.photo.source.id === item.id}
              title={item.label}
              onClick={() => onLibraryPhoto(item)}
              style={{ backgroundImage: `url(${item.thumb})` }}
            />
          ))}
        </div>
        <p className="collateral-hint">Or upload your own:</p>
        <input type="file" accept="image/*" aria-label="Upload a photo" onChange={(e) => onPhoto(e.target.files?.[0])} />
        {design.photo && (
          <div className="collateral-photo-controls">
            <p className="collateral-hint">
              {design.photo.name} · stays in your browser
              <button type="button" className="collateral-link" onClick={() => update((d) => ({ ...d, photo: null }))}>
                Remove
              </button>
            </p>
            {photoExtras}
          </div>
        )}
      </section>

      <section>
        <h2>{n(5)}. Partner logos (optional)</h2>
        <p className="collateral-hint">
          For joint events. A PNG with a transparent background works best.
        </p>
        {design.partnerLogos.map((logo, i) => (
          <p key={`${logo.name}-${i}`} className="collateral-hint">
            {logo.name}
            <button
              type="button"
              className="collateral-link"
              onClick={() => update((d) => ({ ...d, partnerLogos: d.partnerLogos.filter((_, j) => j !== i) }))}
            >
              Remove
            </button>
          </p>
        ))}
        {design.partnerLogos.length < MAX_PARTNER_LOGOS && (
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-label="Upload a partner logo"
            onChange={(e) => {
              void onPartnerLogo(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        )}
      </section>
    </>
  );
}
