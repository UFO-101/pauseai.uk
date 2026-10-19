import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { exampleEvent } from "@/components/events/EventList.examples";
import { homeEventsCopy as copy } from "@/lib/content/home-events";
import type { LumaEntry, Place } from "@/lib/events";
import HomeEvents from "./HomeEvents";

const WESTMINSTER: Place = { latitude: 51.5, longitude: -0.13 };
const OXFORD: Place = { latitude: 51.75, longitude: -1.26 };

const inPerson = (n: number, city: string, place?: Place): LumaEntry =>
  exampleEvent(n, { name: `Meetup in ${city}`, geo_address_info: { city }, ...(place ? { place } : {}) });
const online = (n: number): LumaEntry => exampleEvent(n, { name: `Online call ${n}` });

const EVENTS = [inPerson(1, "London", WESTMINSTER), online(2), inPerson(3, "Oxford", OXFORD), inPerson(4, "Oxford")];

afterEach(async () => {
  vi.restoreAllMocks();
  await page.viewport(414, 896);
});

const heading = (name: string) => page.getByRole("heading", { name, level: 2 });
const chooseButton = () => page.getByRole("button", { name: copy.chooseWhere });
const onlineButton = () => page.getByRole("button", { name: copy.online, exact: true });
const picker = () => page.getByRole("group", { name: copy.pickerLabel });
const shownEvents = () => [...document.querySelectorAll("h3")].map((h) => h.textContent);

async function openPicker() {
  await chooseButton().click();
  await expect.element(picker()).toBeVisible();
}

describe("HomeEvents", () => {
  it("lists every upcoming event until something is chosen", async () => {
    await render(<HomeEvents events={EVENTS} />);
    await expect.element(heading(copy.headingAll)).toBeVisible();
    await expect.element(chooseButton()).toHaveAttribute("aria-expanded", "false");
    await expect.element(onlineButton()).toHaveAttribute("aria-pressed", "false");
    expect(shownEvents()).toEqual(["Meetup in London", "Online call 2", "Meetup in Oxford", "Meetup in Oxford"]);
  });

  it("points to the calendar when there's nothing on at all", async () => {
    await render(<HomeEvents events={[]} />);
    await expect.element(page.getByRole("link", { name: "event calendar" })).toBeVisible();
  });

  it("shows only the online events, and back", async () => {
    // Wide enough that the open choice of where doesn't cover the button.
    await page.viewport(1200, 800);
    await render(<HomeEvents events={EVENTS} />);
    await openPicker();
    await onlineButton().click();
    await expect.element(heading(copy.headingOnline)).toBeVisible();
    await expect.element(onlineButton()).toHaveAttribute("aria-pressed", "true");
    await expect.element(picker()).not.toBeInTheDocument();
    expect(shownEvents()).toEqual(["Online call 2"]);
    await onlineButton().click();
    await expect.element(heading(copy.headingAll)).toBeVisible();
  });

  it("points to the calendar when nothing's online", async () => {
    await render(<HomeEvents events={[inPerson(1, "London", WESTMINSTER)]} />);
    await onlineButton().click();
    await expect.element(page.getByRole("link", { name: "event calendar" })).toBeVisible();
  });

  it("opens the choice of where under its button, and closes it from the button", async () => {
    await render(<HomeEvents events={EVENTS} />);
    await openPicker();
    await expect.element(chooseButton()).toHaveAttribute("aria-expanded", "true");
    const controls = chooseButton().element().getAttribute("aria-controls");
    expect(document.getElementById(controls!)).toBe(picker().element());
    await chooseButton().click();
    await expect.element(picker()).not.toBeInTheDocument();
  });

  it("closes the choice on Escape, back to its button, but not on other keys", async () => {
    await render(<HomeEvents events={EVENTS} />);
    await openPicker();
    await userEvent.keyboard("{Shift}");
    await expect.element(picker()).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect.element(picker()).not.toBeInTheDocument();
    expect(document.activeElement).toBe(chooseButton().element());
  });

  it("closes the choice on a click outside it, but not inside it", async () => {
    await render(<HomeEvents events={EVENTS} />);
    await openPicker();
    await page.getByLabelText(copy.postcodeLabel).click();
    await expect.element(picker()).toBeVisible();
    await page.getByRole("heading", { name: copy.headingAll }).click();
    await expect.element(picker()).not.toBeInTheDocument();
  });

  it("shows a local group's in-person events, and goes back to anywhere", async () => {
    await render(<HomeEvents events={EVENTS} />);
    await onlineButton().click();
    await openPicker();
    await expect.element(page.getByRole("radio", { name: copy.anywhere })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("radio", { name: "Oxford" }).click();
    await expect.element(heading(copy.headingNear("Oxford"))).toBeVisible();
    await expect.element(picker()).not.toBeInTheDocument();
    await expect.element(onlineButton()).toHaveAttribute("aria-pressed", "false");
    expect(shownEvents()).toEqual(["Meetup in Oxford", "Meetup in Oxford"]);

    await openPicker();
    await expect.element(page.getByRole("radio", { name: "Oxford" })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("radio", { name: copy.anywhere }).click();
    await expect.element(heading(copy.headingAll)).toBeVisible();
  });

  it("says when nothing's on near the place chosen", async () => {
    await render(<HomeEvents events={EVENTS} />);
    await openPicker();
    await page.getByRole("radio", { name: "Glasgow" }).click();
    await expect.element(page.getByText(copy.noneNear)).toBeVisible();
  });

  it("uses the device's location when asked, saying so while it looks", async () => {
    let succeed: PositionCallback = () => {};
    vi.spyOn(navigator.geolocation, "getCurrentPosition").mockImplementation((success) => {
      succeed = success;
    });
    await render(<HomeEvents events={EVENTS} />);
    await openPicker();
    await page.getByRole("button", { name: copy.useLocation }).click();
    await expect.element(page.getByRole("button", { name: copy.locating })).toBeDisabled();
    succeed({ coords: { latitude: OXFORD.latitude, longitude: OXFORD.longitude } } as GeolocationPosition);
    await expect.element(heading(copy.headingNearYou)).toBeVisible();
    expect(shownEvents()).toEqual(["Meetup in Oxford", "Meetup in Oxford"]);

    // Chosen by place, so no group is checked.
    await openPicker();
    expect(page.getByRole("radio", { checked: true }).elements()).toHaveLength(0);
  });

  it("says when the device's location can't be had", async () => {
    vi.spyOn(navigator.geolocation, "getCurrentPosition").mockImplementation((_success, failure) => {
      failure!({ code: 1 } as GeolocationPositionError);
    });
    await render(<HomeEvents events={EVENTS} />);
    await openPicker();
    await page.getByRole("button", { name: copy.useLocation }).click();
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.locationFailed);
    await expect.element(page.getByRole("button", { name: copy.useLocation })).toBeEnabled();
  });

  it("says when the browser has no location to give", async () => {
    const geolocation = Object.getOwnPropertyDescriptor(Navigator.prototype, "geolocation")!;
    Object.defineProperty(Navigator.prototype, "geolocation", { configurable: true, get: () => undefined });
    try {
      await render(<HomeEvents events={EVENTS} />);
      await openPicker();
      await page.getByRole("button", { name: copy.useLocation }).click();
      await expect.element(page.getByRole("alert")).toHaveTextContent(copy.locationFailed);
    } finally {
      Object.defineProperty(Navigator.prototype, "geolocation", geolocation);
    }
  });

  it("looks up a postcode and names its district", async () => {
    const fetch = vi
      .spyOn(window, "fetch")
      .mockResolvedValue(Response.json({ ok: true, place: OXFORD, name: "Oxford" }));
    await render(<HomeEvents events={EVENTS} />);
    await openPicker();
    await page.getByLabelText(copy.postcodeLabel).fill("OX1 1AA");
    await page.getByRole("button", { name: copy.postcodeButton }).click();
    await expect.element(heading(copy.headingNear("Oxford"))).toBeVisible();
    expect(fetch).toHaveBeenCalledWith("/api/events/place", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toEqual({ postcode: "OX1 1AA" });
  });

  it("asks for a postcode, and says why one can't be looked up", async () => {
    const fetch = vi
      .spyOn(window, "fetch")
      .mockResolvedValueOnce(Response.json({ ok: false, message: copy.postcodeNotFound }))
      .mockRejectedValueOnce(new Error("offline"));
    await render(<HomeEvents events={EVENTS} />);
    await openPicker();
    const field = page.getByLabelText(copy.postcodeLabel);
    const find = page.getByRole("button", { name: copy.postcodeButton });

    await find.click();
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.postcodeRequired);
    await expect.element(field).toHaveAttribute("aria-invalid", "true");
    expect(fetch).not.toHaveBeenCalled();

    await field.fill("ZZ1 1ZZ");
    await find.click();
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.postcodeNotFound);

    await find.click();
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.postcodeFailed);
    await expect.element(find).toBeEnabled();
  });
});
