import type { LumaEvent, Place } from "@/lib/events";

/** Westminster, where the test MPs' postcodes are. */
export const westminster: Place = { latitude: 51.4995, longitude: -0.1248 };

const event = (name: string, day: number, place?: Place): LumaEvent => ({
  url: name,
  name,
  start_at: `2030-01-0${day}T18:00:00.000Z`,
  ...(place ? { geo_address_info: { city: "London" }, place } : {}),
});

/** One online event, one in London and one in Manchester. */
export const exampleEvents = [
  event("Online call", 1),
  event("London meeting", 2, westminster),
  event("Manchester discussion", 3, { latitude: 53.48, longitude: -2.24 }),
];
