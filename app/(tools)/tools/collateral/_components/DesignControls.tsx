"use client";

import type { ReactNode } from "react";
import { MAX_PARTNER_LOGOS, QR_SIZES } from "@/lib/collateral/design";
import { eventDayLabel, eventFieldValues, eventLink, type CalendarEvent } from "@/lib/collateral/eventText";
import { isLumaEventLink } from "@/lib/collateral/lint";
import type { LibraryPhoto } from "@/lib/collateral/photos";
import { QR_LABEL_MAX, QR_URL_MAX } from "@/lib/collateral/project";
import { MAX_QR_CODES, normaliseUrl, type QrCode } from "@/lib/collateral/qr";
import { drawableToPngDataUrl, fileToDrawable, loadDataUrl, loadImage } from "@/lib/collateral/render";
import { defaultValues, getTemplate } from "@/lib/collateral/templates";
import CharCount from "./CharCount";
import StylePicker from "./StylePicker";
import {
  DESIGN_TEMPLATES,
  designQrCodes,
  designTemplate,
  designValues,
  withQrCodes,
  type DesignState,
} from "./designState";
import { Choice, ChoiceGrid, PhotoLibrary } from "./kit/Choices";
import { FieldLabel, FileInput, FormButton, Segmented, Select, TextArea, TextInput } from "./kit/Fields";
import { Hint, LinkButton } from "./kit/Notes";
import { ControlsSection } from "./kit/Studio";
import styles from "./DesignControls.module.css";

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
export default function DesignControls({
  design,
  update,
  events,
  firstSection,
  photoExtras,
  headlineExtras,
  qrNote,
  onQrAdded,
  onMessage,
}: Props) {
  const template = designTemplate(design);
  const values = designValues(design);
  const qrCodes = designQrCodes(design);
  const n = (i: number) => firstSection + i;

  function setValue(key: string, value: string) {
    update((d) => ({
      ...d,
      valuesByTemplate: { ...d.valuesByTemplate, [template.id]: { ...designValues(d), [key]: value } },
    }));
  }

  function importEvent(id: string) {
    // The select only offers these events, and its placeholder never fires a change.
    const ev = events.find((e) => e.id === id)!;
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
    return { label: template.id === "event" ? "Scan to RSVP" : "Scan to join", url: values.url.trim() || "pauseai.uk" };
  }

  function updateQr(index: number, patch: Partial<QrCode>) {
    update((d) =>
      withQrCodes(
        d,
        designQrCodes(d).map((c, i) => (i === index ? { ...c, ...patch } : c)),
      ),
    );
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
      update((d) => ({
        ...d,
        partnerLogos: [...d.partnerLogos, { name: file.name, dataUrl, drawable }].slice(0, MAX_PARTNER_LOGOS),
      }));
    } catch {
      onMessage("Could not read that logo. Try a PNG with a transparent background.");
    }
  }

  return (
    <>
      <ControlsSection heading={`${n(0)}. Layout`}>
        <ChoiceGrid role="radiogroup" label="Layout">
          {DESIGN_TEMPLATES.map((t) => (
            <Choice
              key={t.id}
              checked={t.id === template.id}
              onClick={() => update((d) => ({ ...d, templateId: t.id }))}
              title={t.label}
              description={t.description}
            />
          ))}
        </ChoiceGrid>
        {/* Right under the Event card, which is last in the list. Kept outside the radio group, which may only hold its options. */}
        {events.length > 0 && (
          <div className={template.id === "event" ? `${styles.eventImport} ${styles.active}` : styles.eventImport}>
            <FieldLabel htmlFor="collateral-import-event">Start from one of our events</FieldLabel>
            <Select id="collateral-import-event" value="" onChange={(e) => importEvent(e.target.value)}>
              <option value="">Choose an event…</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {eventDayLabel(ev)} · {ev.name}
                </option>
              ))}
            </Select>
            <Hint>Fills in the Event layout, and adds a QR code for the event.</Hint>
          </div>
        )}
      </ControlsSection>

      <ControlsSection heading={`${n(1)}. Style`}>
        <StylePicker themeId={design.themeId} onTheme={(themeId) => update((d) => ({ ...d, themeId }))} />
      </ControlsSection>

      <ControlsSection heading={`${n(2)}. Text`}>
        {template.fields.map((field) => {
          const id = `collateral-${template.id}-${field.key}`;
          // designValues fills in every field's default.
          const value = values[field.key];
          // No layout offered here has toggle fields (only Brush does, and it is hidden; see designState.ts).
          return (
            <div key={field.key} className={styles.field}>
              <FieldLabel htmlFor={id} note={field.hint && <> · {field.hint}</>}>
                {field.label}
              </FieldLabel>
              {field.kind === "textarea" ? (
                <TextArea
                  id={id}
                  rows={2}
                  maxLength={field.maxLength}
                  value={value}
                  onChange={(e) => setValue(field.key, e.target.value)}
                />
              ) : field.kind === "date" || field.kind === "time" ? (
                <TextInput
                  id={id}
                  type={field.kind}
                  value={value}
                  onChange={(e) => setValue(field.key, e.target.value)}
                />
              ) : (
                <TextInput
                  id={id}
                  type="text"
                  maxLength={field.maxLength}
                  value={value}
                  onChange={(e) => setValue(field.key, e.target.value)}
                />
              )}
              <CharCount value={value} max={field.maxLength} />
              {field.key === "headline" && headlineExtras}
            </div>
          );
        })}
      </ControlsSection>

      <ControlsSection heading={`${n(3)}. QR codes (optional)`}>
        {qrCodes.map((code, i) => (
          <div key={i} className={styles.qrRow}>
            <div className={styles.qrFields}>
              <TextInput
                type="text"
                aria-label={`QR code ${i + 1} label`}
                placeholder="Label under the code, e.g. RSVP"
                maxLength={QR_LABEL_MAX}
                value={code.label}
                onChange={(e) => updateQr(i, { label: e.target.value })}
              />
              <TextInput
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
              className={styles.qrRemove}
              aria-label={`Remove QR code ${i + 1}`}
              onClick={() =>
                update((d) =>
                  withQrCodes(
                    d,
                    designQrCodes(d).filter((_, j) => j !== i),
                  ),
                )
              }
            >
              ×
            </button>
          </div>
        ))}
        <FormButton
          type="button"
          variant="ghost"
          size="small"
          disabled={qrCodes.length >= MAX_QR_CODES}
          onClick={() => {
            const code = newQr();
            update((d) => withQrCodes(d, [...designQrCodes(d), code]));
            onQrAdded?.();
          }}
        >
          {qrCodes.length === 0 ? "Add a QR code" : `Add another (${qrCodes.length} of ${MAX_QR_CODES})`}
        </FormButton>
        {qrCodes.length > 0 && (
          <div className={styles.qrSize}>
            <FieldLabel>Size</FieldLabel>
            <Segmented
              label="QR code size"
              options={QR_SIZES.map((s) => ({ value: s.id, label: s.label }))}
              value={design.qrSize}
              onChange={(qrSize) => update((d) => ({ ...d, qrSize }))}
            />
          </div>
        )}
        {/* UTM tagging is switched off until we have a way to read the results. See qrTarget in lib/collateral/qr.ts. */}
        {qrCodes.length > 0 && qrNote}
      </ControlsSection>

      <ControlsSection heading={`${n(4)}. Photo (optional)`}>
        <PhotoLibrary current={design.photo?.source} onPick={onLibraryPhoto} />
        <Hint>Or upload your own:</Hint>
        <FileInput accept="image/*" aria-label="Upload a photo" onChange={(e) => onPhoto(e.target.files![0])} />
        {design.photo && (
          <div>
            <Hint>
              {design.photo.name} · stays in your browser
              <LinkButton onClick={() => update((d) => ({ ...d, photo: null }))}>Remove</LinkButton>
            </Hint>
            {photoExtras}
          </div>
        )}
      </ControlsSection>

      <ControlsSection heading={`${n(5)}. Partner logos (optional)`}>
        <Hint>For joint events. A PNG with a transparent background works best.</Hint>
        {design.partnerLogos.map((logo, i) => (
          <Hint key={`${logo.name}-${i}`}>
            {logo.name}
            <LinkButton
              onClick={() => update((d) => ({ ...d, partnerLogos: d.partnerLogos.filter((_, j) => j !== i) }))}
            >
              Remove
            </LinkButton>
          </Hint>
        ))}
        {design.partnerLogos.length < MAX_PARTNER_LOGOS && (
          <FileInput
            accept="image/png,image/jpeg,image/webp"
            aria-label="Upload a partner logo"
            onChange={(e) => {
              void onPartnerLogo(e.target.files![0]);
              e.target.value = "";
            }}
          />
        )}
      </ControlsSection>
    </>
  );
}
