import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { campaigns } from "@/lib/content/email-your-mp";
import type { LumaEntry, Place } from "@/lib/events";
import { markSent, saveLookup } from "./draft";
import NearbyEvents from "./NearbyEvents";

const [letterToPm] = campaigns;
const MP = {
  name: "Polly Placeholder",
  salutation: "Ms Placeholder",
  constituency: "Cities of London and Westminster",
  email: "polly@example.org",
};
const WESTMINSTER: Place = { latitude: 51.4995, longitude: -0.1248 };

const event = (name: string, day: number, place?: Place): LumaEntry => ({
  event: {
    url: name,
    name,
    start_at: `2030-01-0${day}T18:00:00.000Z`,
    ...(place ? { geo_address_info: { city: "London" }, place } : {}),
  },
});
const EVENTS = [
  event("Online call", 1),
  event("London meeting", 2, WESTMINSTER),
  event("Manchester discussion", 3, { latitude: 53.48, longitude: -2.24 }),
];

function sent(place?: Place | null) {
  saveLookup({
    campaign: letterToPm.slug,
    name: "Jane Smith",
    address: "1 High St",
    postcode: "SW1A 1AA",
    mp: MP,
    statuses: {},
    place,
  });
  markSent({ campaign: letterToPm.slug, mpName: MP.name });
}

afterEach(() => sessionStorage.clear());

describe("NearbyEvents", () => {
  it("shows the events near the sender, and the next online one, as the home page's Upcoming events", async () => {
    sent(WESTMINSTER);
    await render(<NearbyEvents campaignSlug={letterToPm.slug} events={EVENTS} />);
    await expect.element(page.getByRole("heading", { name: "Upcoming events" })).toBeVisible();
    await expect.element(page.getByText("London meeting")).toBeVisible();
    await expect.element(page.getByText("Online call")).toBeVisible();
    await expect.element(page.getByText("Manchester discussion")).not.toBeInTheDocument();
  });

  it("shows online events when it doesn't know where the sender is", async () => {
    sent(null);
    await render(<NearbyEvents campaignSlug={letterToPm.slug} events={EVENTS} />);
    await expect.element(page.getByText("Online call")).toBeVisible();
    await expect.element(page.getByText("London meeting")).not.toBeInTheDocument();
  });

  it("shows online events without a letter just sent or a lookup, as when the page is opened from a link", async () => {
    await render(<NearbyEvents campaignSlug={letterToPm.slug} events={EVENTS} />);
    await expect.element(page.getByText("Online call")).toBeVisible();
    await expect.element(page.getByText("London meeting")).not.toBeInTheDocument();
  });

  it("shows nothing with no events to show", async () => {
    sent(WESTMINSTER);
    await render(<NearbyEvents campaignSlug={letterToPm.slug} events={[]} />);
    await expect.element(page.getByRole("heading", { name: "Upcoming events" })).not.toBeInTheDocument();
  });
});
