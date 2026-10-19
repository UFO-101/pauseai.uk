import { describe, expect, it } from "vitest";
import { localGroupMetadata, localGroupPages } from "./local-group-pages";
import { localGroups } from "./local-groups";

describe("local group pages", () => {
  it("has a page for every local group, under its own name", () => {
    expect(Object.keys(localGroupPages).sort()).toEqual(localGroups.map((g) => g.name).sort());
    for (const [name, page] of Object.entries(localGroupPages)) expect(page.name).toBe(name);
  });

  it("gives every page a hero action and a contact button", () => {
    for (const page of Object.values(localGroupPages)) {
      expect(page.hero.actions.length, page.name).toBeGreaterThan(0);
      expect(page.contact.actions.length, page.name).toBeGreaterThan(0);
    }
  });
});

describe("localGroupMetadata", () => {
  it("builds the group's titles, social cards and canonical path", () => {
    expect(localGroupMetadata("Oxford", "/oxford", "About Oxford.")).toEqual({
      title: "Oxford Group",
      openGraph: {
        title: "PauseAI Oxford",
        description: "About Oxford.",
        images: [{ url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 }],
        url: "https://pauseai.uk/oxford",
      },
      twitter: {
        title: "PauseAI Oxford",
        description: "About Oxford.",
        images: ["/images/open-graph/open-graph-1080-1080.jpg"],
      },
      alternates: { canonical: "/oxford" },
    });
  });
});
