import { describe, expect, it } from "vitest";
import { localGroups } from "@/lib/content/local-groups";
import { ANYWHERE } from "@/lib/events";
import { eventsFromQuery, eventsQueryValue, withEventsQuery } from "./events-url";

const oxford = { where: { kind: "group", name: "Oxford" }, onlineOnly: false } as const;
const online = { where: ANYWHERE, onlineOnly: true } as const;
const place = { where: { kind: "place", place: { latitude: 51.5, longitude: -0.13 } }, onlineOnly: false } as const;

describe("eventsFromQuery", () => {
  it("reads a local group by its page's slug, and online", () => {
    expect(eventsFromQuery("?events=oxford", localGroups)).toEqual(oxford);
    expect(eventsFromQuery("?utm=x&events=west-of-england", localGroups)).toEqual({
      where: { kind: "group", name: "West of England" },
      onlineOnly: false,
    });
    expect(eventsFromQuery("?events=online", localGroups)).toEqual(online);
  });

  it("asks nothing without the parameter, or with a value that's no group", () => {
    expect(eventsFromQuery("", localGroups)).toBeUndefined();
    expect(eventsFromQuery("?events=", localGroups)).toBeUndefined();
    expect(eventsFromQuery("?events=Oxford", localGroups)).toBeUndefined();
    expect(eventsFromQuery("?events=/oxford", localGroups)).toBeUndefined();
  });
});

describe("eventsQueryValue", () => {
  it("names a local group or online, and nothing for anywhere or a place", () => {
    expect(eventsQueryValue(oxford, localGroups)).toBe("oxford");
    expect(eventsQueryValue(online, localGroups)).toBe("online");
    expect(eventsQueryValue({ where: ANYWHERE, onlineOnly: false }, localGroups)).toBeUndefined();
    expect(eventsQueryValue(place, localGroups)).toBeUndefined();
  });

  it("round-trips through a link", () => {
    for (const group of localGroups) {
      const showing = { where: { kind: "group", name: group.name }, onlineOnly: false } as const;
      expect(eventsFromQuery(`?events=${eventsQueryValue(showing, localGroups)}`, localGroups)).toEqual(showing);
    }
  });
});

describe("withEventsQuery", () => {
  const at = (href: string) => new URL(href);

  it("sets the parameter and scrolls the link to the events, keeping other parameters", () => {
    expect(withEventsQuery(at("https://pauseai.uk/?utm=x"), oxford, localGroups).href).toBe(
      "https://pauseai.uk/?utm=x&events=oxford#events",
    );
    expect(withEventsQuery(at("https://pauseai.uk/?events=oxford#events"), online, localGroups).href).toBe(
      "https://pauseai.uk/?events=online#events",
    );
  });

  it("takes the parameter off for anywhere or a place, leaving the rest of the link", () => {
    expect(withEventsQuery(at("https://pauseai.uk/?events=oxford#events"), place, localGroups).href).toBe(
      "https://pauseai.uk/#events",
    );
    expect(
      withEventsQuery(at("https://pauseai.uk/?a=1&events=online"), { where: ANYWHERE, onlineOnly: false }, localGroups)
        .href,
    ).toBe("https://pauseai.uk/?a=1");
  });

  it("leaves the given URL as it was", () => {
    const url = at("https://pauseai.uk/");
    withEventsQuery(url, oxford, localGroups);
    expect(url.href).toBe("https://pauseai.uk/");
  });
});
