import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { useState, type ReactNode } from "react";
import { MAX_PARTNER_LOGOS } from "@/lib/collateral/design";
import type { CalendarEvent } from "@/lib/collateral/eventText";
import { LIBRARY_PHOTOS } from "@/lib/collateral/photos";
import { MAX_QR_CODES } from "@/lib/collateral/qr";
import { THEMES } from "@/lib/collateral/themes";
import { canvasFile } from "@/tests/browser/qr-images";
import DesignControls from "./DesignControls";
import { designQrCodes, designValues, newDesign, withQrCodes, type DesignState } from "./designState";

// Library photos that fail to load, which the real ones never do.
const { failImage } = vi.hoisted(() => ({ failImage: { on: false } }));
vi.mock("@/lib/collateral/render", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/collateral/render")>();
  return {
    ...actual,
    loadImage: (src: string) => (failImage.on ? Promise.reject(new Error("no")) : actual.loadImage(src)),
  };
});

afterEach(() => {
  failImage.on = false;
});

const event: CalendarEvent = {
  id: "evt123",
  name: "Letter writing",
  startAt: "2030-03-02T18:00:00Z",
  venue: "Hall, Leeds",
  city: "Leeds",
};

function Harness(props: {
  initial?: DesignState;
  events?: CalendarEvent[];
  extras?: boolean;
  onQrAdded?: () => void;
  onMessage?: (m: string | null) => void;
  spy?: (d: DesignState) => void;
}) {
  const [design, setDesign] = useState<DesignState>(props.initial ?? newDesign());
  const [message, setMessage] = useState<string | null>(null);
  props.spy?.(design);
  const extra = (x: string): ReactNode => (props.extras ? <span data-testid={x}>{x}</span> : undefined);
  return (
    <>
      <DesignControls
        design={design}
        update={(fn) => setDesign(fn)}
        events={props.events ?? []}
        firstSection={2}
        photoExtras={extra("photo-extras")}
        headlineExtras={extra("headline-extras")}
        qrNote={extra("qr-note")}
        onQrAdded={props.onQrAdded}
        onMessage={(m) => {
          setMessage(m);
          props.onMessage?.(m);
        }}
      />
      <p data-testid="message">{message}</p>
    </>
  );
}

async function upload(label: string, file: File | null) {
  const input = page.getByLabelText(label).element() as HTMLInputElement;
  const list = new DataTransfer();
  if (file) list.items.add(file);
  input.files = list.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

const png = () => {
  const c = document.createElement("canvas");
  c.width = 40;
  c.height = 20;
  c.getContext("2d")!.fillRect(0, 0, 40, 20);
  return canvasFile(c, "logo.png");
};

describe("DesignControls", () => {
  it("numbers its sections from where the studio says, and picks a layout and style", async () => {
    let design = newDesign();
    await render(<Harness spy={(d) => (design = d)} />);
    await expect.element(page.getByRole("heading", { name: "2. Layout" })).toBeVisible();
    await page.getByRole("radio", { name: /Quote/ }).click();
    expect(design.templateId).toBe("quote");
    await page.getByRole("radio", { name: THEMES[2].label }).click();
    expect(design.themeId).toBe(THEMES[2].id);
  });

  it("edits the layout's text, with the right kind of input for each field", async () => {
    let design = newDesign("event");
    await render(<Harness initial={newDesign("event")} extras spy={(d) => (design = d)} />);
    await page.getByLabelText("Event title").fill("A new title");
    await page.getByLabelText("Date").fill("2031-01-02");
    await page.getByLabelText("Start time").fill("18:30");
    await page.getByLabelText(/Venue/).fill("Somewhere");
    expect(designValues(design)).toMatchObject({
      headline: "A new title",
      date: "2031-01-02",
      start: "18:30",
      venue: "Somewhere",
    });
    await expect.element(page.getByText("· Optional").first()).toBeVisible();
    await expect.element(page.getByTestId("headline-extras")).toBeVisible();
  });

  it("fills in the Event layout from one of our events, with a QR code for it", async () => {
    let design = newDesign();
    const onMessage = vi.fn();
    await render(<Harness events={[event]} spy={(d) => (design = d)} onMessage={onMessage} />);
    await page.getByLabelText("Start from one of our events").selectOptions("evt123");
    expect(design.templateId).toBe("event");
    expect(designValues(design)).toMatchObject({
      headline: "Letter writing",
      venue: "Hall, Leeds",
      group: "Leeds",
      url: "pauseai.uk/events",
    });
    expect(designQrCodes(design)).toEqual([{ label: "Scan to RSVP", url: "lu.ma/evt123" }]);
    expect(onMessage.mock.lastCall![0]).toMatch(/^Filled in from “Letter writing”/);
  });

  it("replaces the QR code for the old address or an earlier event, keeping its label and the other codes", async () => {
    let design = newDesign();
    const initial = withQrCodes(
      { ...newDesign("event"), valuesByTemplate: { event: { url: "pauseai.uk/old", group: "Mine" } } },
      [
        { label: "Old", url: "https://pauseai.uk/old" },
        { label: "Keep", url: "pauseai.uk/join" },
        { label: "", url: "lu.ma/earlier1" },
      ],
    );
    await render(<Harness initial={initial} events={[{ ...event, city: undefined }]} spy={(d) => (design = d)} />);
    await page.getByLabelText("Start from one of our events").selectOptions("evt123");
    expect(designQrCodes(design)).toEqual([
      { label: "Old", url: "lu.ma/evt123" },
      { label: "Keep", url: "pauseai.uk/join" },
    ]);
    // An event with no city keeps the group already there.
    expect(designValues(design).group).toBe("Mine");
  });

  it("starts the event QR code's label afresh when the replaced one had none, and when there were no codes", async () => {
    let design = newDesign();
    const initial = withQrCodes({ ...newDesign("event"), valuesByTemplate: { event: { url: "" } } }, [
      { label: "", url: "lu.ma/earlier1" },
    ]);
    const { rerender } = await render(<Harness initial={initial} events={[event]} spy={(d) => (design = d)} />);
    await page.getByLabelText("Start from one of our events").selectOptions("evt123");
    expect(designQrCodes(design)[0].label).toBe("Scan to RSVP");
    await rerender(
      <Harness initial={{ ...newDesign("event"), qrCodesByTemplate: {} }} events={[event]} spy={(d) => (design = d)} />,
    );
  });

  it("adds QR codes, the first for the design's own address, up to the limit", async () => {
    let design = newDesign();
    const onQrAdded = vi.fn();
    await render(<Harness extras onQrAdded={onQrAdded} spy={(d) => (design = d)} />);
    await expect.element(page.getByTestId("qr-note")).not.toBeInTheDocument();
    await page.getByRole("button", { name: "Add a QR code" }).click();
    expect(designQrCodes(design)).toEqual([{ label: "Scan to join", url: "pauseai.uk" }]);
    expect(onQrAdded).toHaveBeenCalled();
    await expect.element(page.getByTestId("qr-note")).toBeVisible();
    for (let i = 1; i < MAX_QR_CODES; i++) await page.getByRole("button", { name: /Add another/ }).click();
    expect(designQrCodes(design)[1]).toEqual({ label: "", url: "" });
    await expect.element(page.getByRole("button", { name: /Add another/ })).toBeDisabled();

    await page.getByLabelText("QR code 2 label").fill("Events");
    await page.getByLabelText("QR code 2 web address").fill("pauseai.uk/events");
    expect(designQrCodes(design)[1]).toEqual({ label: "Events", url: "pauseai.uk/events" });
    await page.getByRole("button", { name: "Remove QR code 1" }).click();
    expect(designQrCodes(design)).toHaveLength(MAX_QR_CODES - 1);
    await page.getByRole("radio", { name: "Large" }).click();
    expect(design.qrSize).toBe("l");
  });

  it("starts an event's first QR code as an RSVP, and uses pauseai.uk when there's no address", async () => {
    let design = newDesign();
    const initial = { ...newDesign("event"), valuesByTemplate: { event: { url: " " } } };
    await render(<Harness initial={initial} spy={(d) => (design = d)} />);
    await page.getByRole("button", { name: "Add a QR code" }).click();
    expect(designQrCodes(design)).toEqual([{ label: "Scan to RSVP", url: "pauseai.uk" }]);
  });

  it("picks a library photo, uploads one, and removes it", async () => {
    let design = newDesign();
    await render(<Harness extras spy={(d) => (design = d)} />);
    await page.getByRole("button", { name: LIBRARY_PHOTOS[0].label }).click();
    await expect.poll(() => design.photo?.name).toBe(LIBRARY_PHOTOS[0].label);
    await expect
      .element(page.getByRole("button", { name: LIBRARY_PHOTOS[0].label }))
      .toHaveAttribute("aria-pressed", "true");
    await expect.element(page.getByTestId("photo-extras")).toBeVisible();
    await upload("Upload a photo", await png());
    await expect.poll(() => design.photo?.source.kind).toBe("upload");
    await expect
      .element(page.getByRole("button", { name: LIBRARY_PHOTOS[0].label }))
      .toHaveAttribute("aria-pressed", "false");
    await page.getByText("Remove").click();
    expect(design.photo).toBeNull();
    await upload("Upload a photo", null);
    expect(design.photo).toBeNull();
  });

  it("says when a photo can't be read or loaded", async () => {
    await render(<Harness />);
    await upload("Upload a photo", new File(["nope"], "x.png", { type: "image/png" }));
    await expect.element(page.getByTestId("message")).toHaveTextContent("Could not read that image. Try a JPG or PNG.");
    failImage.on = true;
    await page.getByRole("button", { name: LIBRARY_PHOTOS[1].label }).click();
    await expect.element(page.getByTestId("message")).toHaveTextContent("Could not load that photo.");
  });

  it("adds partner logos up to the limit, and removes them", async () => {
    let design = newDesign();
    await render(<Harness spy={(d) => (design = d)} />);
    for (let i = 0; i < MAX_PARTNER_LOGOS; i++) {
      await upload("Upload a partner logo", await png());
      await expect.poll(() => design.partnerLogos.length).toBe(i + 1);
    }
    await expect.element(page.getByLabelText("Upload a partner logo")).not.toBeInTheDocument();
    await page.getByRole("button", { name: "Remove" }).first().click();
    expect(design.partnerLogos).toHaveLength(MAX_PARTNER_LOGOS - 1);
    await upload("Upload a partner logo", null);
    await upload("Upload a partner logo", new File(["nope"], "x.png", { type: "image/png" }));
    await expect
      .element(page.getByTestId("message"))
      .toHaveTextContent("Could not read that logo. Try a PNG with a transparent background.");
  });
});
