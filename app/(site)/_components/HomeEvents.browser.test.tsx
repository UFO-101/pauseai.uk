import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { exampleEvent } from "@/components/events/EventList.examples";
import { homeEventsCopy as copy } from "@/lib/content/home-events";
import type { LumaEvent, Place } from "@/lib/events";
import HomeEvents from "./HomeEvents";

const WESTMINSTER: Place = { latitude: 51.5, longitude: -0.13 };
const OXFORD: Place = { latitude: 51.75, longitude: -1.26 };

const inPerson = (n: number, city: string, place?: Place): LumaEvent =>
  exampleEvent(n, { name: `Meetup in ${city}`, geo_address_info: { city }, ...(place ? { place } : {}) });
const online = (n: number): LumaEvent => exampleEvent(n, { name: `Online call ${n}` });

const EVENTS = [inPerson(1, "London", WESTMINSTER), online(2), inPerson(3, "Oxford", OXFORD), inPerson(4, "Oxford")];

// The test page's own query (Vitest's session) stays: only what a link adds changes.
const testPage = new URL(window.location.href);
/** The test page, as if opened from a link with `params` added to its query. */
function openAt(params: Record<string, string> = {}) {
  const url = new URL(testPage);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  window.history.replaceState(null, "", url);
}
const query = () => new URLSearchParams(window.location.search);

afterEach(async () => {
  vi.restoreAllMocks();
  openAt();
  await page.viewport(414, 896);
});

const allButton = () => page.getByRole("button", { name: copy.all, exact: true });
const nearButton = (name = copy.chooseWhere) => page.getByRole("button", { name, exact: true });
const chooseButton = () => nearButton();
const onlineButton = () => page.getByRole("button", { name: copy.online, exact: true });
const picker = () => page.getByRole("group", { name: copy.pickerLabel });
const shownEvents = () => [...document.querySelectorAll("h3")].map((h) => h.textContent);

async function openPicker(name = copy.chooseWhere) {
  await nearButton(name).click();
  await expect.element(picker()).toBeVisible();
}

describe("HomeEvents", () => {
  it("lists every upcoming event until something is chosen", async () => {
    await render(<HomeEvents events={EVENTS} />);
    await expect.element(page.getByRole("heading", { name: copy.heading, level: 2 })).toBeVisible();
    await expect.element(page.getByRole("group", { name: copy.switchLabel })).toBeVisible();
    await expect.element(allButton()).toHaveAttribute("aria-pressed", "true");
    await expect.element(chooseButton()).toHaveAttribute("aria-pressed", "false");
    await expect.element(chooseButton()).toHaveAttribute("aria-expanded", "false");
    await expect.element(onlineButton()).toHaveAttribute("aria-pressed", "false");
    expect(shownEvents()).toEqual(["Meetup in London", "Online call 2", "Meetup in Oxford", "Meetup in Oxford"]);
  });

  it("points to the calendar when there's nothing on at all", async () => {
    await render(<HomeEvents events={[]} />);
    await expect.element(page.getByRole("link", { name: "event calendar" })).toBeVisible();
  });

  it("shows only the online events, and all again", async () => {
    // Wide enough that the open choice of where doesn't cover the button.
    await page.viewport(1200, 800);
    await render(<HomeEvents events={EVENTS} />);
    await openPicker();
    await onlineButton().click();
    await expect.element(onlineButton()).toHaveAttribute("aria-pressed", "true");
    await expect.element(allButton()).toHaveAttribute("aria-pressed", "false");
    await expect.element(picker()).not.toBeInTheDocument();
    expect(shownEvents()).toEqual(["Online call 2"]);
    await allButton().click();
    await expect.element(allButton()).toHaveAttribute("aria-pressed", "true");
    expect(shownEvents()).toHaveLength(4);
  });

  it("points to the calendar when nothing's online, and opens no choice from Online", async () => {
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
    await page.getByRole("heading", { name: copy.heading }).click();
    await expect.element(picker()).not.toBeInTheDocument();
  });

  it("shows a local group's in-person events, and goes back to all with the group unchecked", async () => {
    await render(<HomeEvents events={EVENTS} />);
    await onlineButton().click();
    await openPicker();
    // No group is checked until one is chosen: All is the switch's own segment.
    expect(page.getByRole("radio", { checked: true }).elements()).toHaveLength(0);
    await page.getByRole("radio", { name: "Oxford" }).click();
    await expect.element(nearButton(copy.nearShort("Oxford"))).toHaveAttribute("aria-pressed", "true");
    await expect.element(picker()).not.toBeInTheDocument();
    await expect.element(onlineButton()).toHaveAttribute("aria-pressed", "false");
    expect(shownEvents()).toEqual(["Meetup in Oxford", "Meetup in Oxford"]);

    await openPicker(copy.nearShort("Oxford"));
    await expect.element(page.getByRole("radio", { name: "Oxford" })).toHaveAttribute("aria-checked", "true");
    await allButton().click();
    await expect.element(allButton()).toHaveAttribute("aria-pressed", "true");
    await openPicker();
    expect(page.getByRole("radio", { checked: true }).elements()).toHaveLength(0);
  });

  it("says in the address bar what's shown, for a link to it: a local group or online, never a place", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(Response.json({ ok: true, place: OXFORD, name: "Oxford" }));
    openAt({ utm: "x" });
    await render(<HomeEvents events={EVENTS} />);
    await openPicker();
    await page.getByRole("radio", { name: "Oxford" }).click();
    await expect.element(nearButton(copy.nearShort("Oxford"))).toHaveAttribute("aria-pressed", "true");
    expect(query().get("events")).toBe("oxford");
    expect(window.location.hash).toBe("#events");
    // The rest of the link is kept.
    expect(query().get("utm")).toBe("x");
    expect(query().get("sessionId")).toBe(testPage.searchParams.get("sessionId"));

    await onlineButton().click();
    await expect.element(onlineButton()).toHaveAttribute("aria-pressed", "true");
    expect(query().get("events")).toBe("online");

    await allButton().click();
    await expect.element(allButton()).toHaveAttribute("aria-pressed", "true");
    expect(query().get("events")).toBeNull();
    expect(query().get("utm")).toBe("x");

    await openPicker();
    await page.getByRole("radio", { name: "Oxford" }).click();
    await expect.element(nearButton(copy.nearShort("Oxford"))).toHaveAttribute("aria-pressed", "true");
    await openPicker(copy.nearShort("Oxford"));
    await page.getByLabelText(copy.postcodeLabel).fill("OX1 1AA");
    await page.getByRole("button", { name: copy.postcodeButton }).click();
    await expect.element(nearButton(copy.nearShort("Oxford"))).toHaveAttribute("aria-pressed", "true");
    expect(query().get("events")).toBeNull();
  });

  it("shows what a link asks for: a local group's events, or the online ones", async () => {
    openAt({ events: "oxford" });
    await render(<HomeEvents events={EVENTS} />);
    await expect.element(nearButton(copy.nearShort("Oxford"))).toHaveAttribute("aria-pressed", "true");
    expect(shownEvents()).toEqual(["Meetup in Oxford", "Meetup in Oxford"]);
  });

  it("shows the online events for a link to them", async () => {
    openAt({ events: "online" });
    await render(<HomeEvents events={EVENTS} />);
    await expect.element(onlineButton()).toHaveAttribute("aria-pressed", "true");
    expect(shownEvents()).toEqual(["Online call 2"]);
  });

  it("shows everything for a link asking for nothing known", async () => {
    openAt({ events: "atlantis" });
    await render(<HomeEvents events={EVENTS} />);
    await expect.element(allButton()).toHaveAttribute("aria-pressed", "true");
    expect(shownEvents()).toHaveLength(4);
  });

  const pickerBox = () => picker().element().getBoundingClientRect();
  const buttonMiddle = () => {
    const box = chooseButton().element().getBoundingClientRect();
    return box.left + box.width / 2;
  };
  const pointMiddle = () =>
    pickerBox().left + parseFloat(getComputedStyle(picker().element()).getPropertyValue("--popover-point"));

  it("hangs the choice centred under its button when there's room, its point under the button's middle", async () => {
    await page.viewport(1200, 800);
    await render(<HomeEvents events={EVENTS} />);
    await openPicker();
    const box = pickerBox();
    expect(Math.abs(box.left + box.width / 2 - buttonMiddle())).toBeLessThan(1);
    expect(Math.abs(pointMiddle() - buttonMiddle())).toBeLessThan(1);
  });

  it("keeps the choice within the phone's side gutters, the point still under the button, and follows a resize", async () => {
    await page.viewport(1200, 800);
    await render(<HomeEvents events={EVENTS} />);
    await openPicker();
    await page.viewport(414, 896);
    // The resize is followed once its event has run.
    await expect.poll(() => pickerBox().left).toBeGreaterThanOrEqual(16);
    const box = pickerBox();
    expect(box.right).toBeLessThanOrEqual(414 - 16);
    expect(box.left + box.width / 2).not.toBeCloseTo(buttonMiddle(), 0);
    expect(Math.abs(pointMiddle() - buttonMiddle())).toBeLessThan(1);
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
    await expect.element(nearButton(copy.nearYouShort)).toHaveAttribute("aria-pressed", "true");
    expect(shownEvents()).toEqual(["Meetup in Oxford", "Meetup in Oxford"]);

    // Chosen by place, so no group is checked.
    await openPicker(copy.nearYouShort);
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
    await expect.element(nearButton(copy.nearShort("Oxford"))).toBeVisible();
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
