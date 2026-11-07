import { describe, expect, it } from "vitest";
import { tagsForEvent } from "./event-tags";

const TAGS = ["Big events", "Cambridge", "London", "Online", "Oxford", "Scotland", "West of England"];

const event = (over: Partial<Parameters<typeof tagsForEvent>[0]>) => ({
  name: "A meet-up",
  city: null,
  region: null,
  locationType: "offline",
  ...over,
});

describe("tagsForEvent", () => {
  it("tags an event in person by its city", () => {
    expect(tagsForEvent(event({ city: "Cambridge" }), TAGS)).toEqual(["Cambridge"]);
  });

  it("tags one by a place that belongs to a tag, in its city, name or region", () => {
    expect(tagsForEvent(event({ city: "Bristol" }), TAGS)).toEqual(["West of England"]);
    expect(tagsForEvent(event({ name: "PauseAI Southwest Meetup" }), TAGS)).toEqual(["West of England"]);
    expect(tagsForEvent(event({ city: "Dundee", region: "Scotland" }), TAGS)).toEqual(["Scotland"]);
  });

  it("goes by whole words, whatever the case", () => {
    expect(tagsForEvent(event({ name: "PauseAI LONDON social" }), TAGS)).toEqual(["London"]);
    expect(tagsForEvent(event({ name: "Oxfordian talk", city: "Reading" }), TAGS)).toBeNull();
  });

  it("isn't clear for a place with no tag, or none given", () => {
    expect(tagsForEvent(event({ city: "Tunbridge Wells" }), TAGS)).toBeNull();
    expect(tagsForEvent(event({}), TAGS)).toBeNull();
  });

  it("isn't clear when the name and city say different places", () => {
    expect(tagsForEvent(event({ name: "Oxford bus to the march", city: "London" }), TAGS)).toBeNull();
  });

  it("tags a call Online, with the place tag of a group's", () => {
    expect(tagsForEvent(event({ name: "TuesdayPauseday", locationType: "meet" }), TAGS)).toEqual(["Online"]);
    expect(tagsForEvent(event({ name: "PauseAI Oxfordshire Organising", locationType: "zoom" }), TAGS)).toEqual([
      "Online",
      "Oxford",
    ]);
  });

  it("takes one with no place or way of meeting as online only if its name says", () => {
    expect(tagsForEvent(event({ name: "West of England Online Meetup", locationType: "unknown" }), TAGS)).toEqual([
      "Online",
      "West of England",
    ]);
    expect(tagsForEvent(event({ name: "Lessons for the West of England", locationType: "unknown" }), TAGS)).toBeNull();
  });

  it("isn't clear for a call if the calendar has no Online tag", () => {
    expect(tagsForEvent(event({ locationType: "meet" }), ["London"])).toBeNull();
  });

  it("never gives a tag that isn't a place by its words", () => {
    expect(tagsForEvent(event({ name: "Big events and online things", city: "London" }), TAGS)).toEqual(["London"]);
  });

  it("gives only tags the calendar has", () => {
    expect(tagsForEvent(event({ city: "Bristol" }), ["London"])).toBeNull();
  });
});
