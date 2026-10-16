import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEMIS_LETTER_QUOTES,
  DEMIS_LETTER_SIGNATORIES,
  demisLetterDisplayName,
  demisLetterDisplayType,
  demisLetterOrganisations,
  demisLetterParliamentarians,
  demisLetterPortraitPath,
} from "./dear-sir-demis-2025";

const inPublic = (path: string) => existsSync(join("public", path));

describe("the letter to Sir Demis's signatories", () => {
  it("are the 63 parliamentarians and 5 organisations the list had when it moved here", () => {
    expect(DEMIS_LETTER_SIGNATORIES).toHaveLength(68);
    const counts: Record<string, number> = {};
    for (const { type } of demisLetterParliamentarians()) counts[type] = (counts[type] ?? 0) + 1;
    expect(counts).toEqual({ MP: 14, Baroness: 12, MSP: 10, MLA: 10, Lord: 8, MS: 7, Bishop: 2 });
  });

  it("are listed by the last word of their name, past titles and post-nominals, as on the old page", () => {
    const names = demisLetterParliamentarians().map((s) => s.name);
    // Peers "of" somewhere sort under the place.
    expect(names.slice(0, 2)).toEqual(["Clare Adamson", "Baroness Foster of Aghadrumsee"]);
    expect(names.indexOf("Sir Desmond Swayne")).toBeGreaterThan(names.indexOf("Baroness Kidron"));
  });

  it("leave out anyone whose portrait wasn't found", () => {
    const signatories = [
      { name: "Jane Bloggs MP", type: "MP", status: "error" },
      { name: "Joe Bloggs MP", type: "MP", status: "success" },
    ];
    expect(demisLetterParliamentarians(signatories).map((s) => s.name)).toEqual(["Joe Bloggs MP"]);
  });

  it("each have a portrait in public/", () => {
    const missing = demisLetterParliamentarians()
      .map((s) => demisLetterPortraitPath(s))
      .filter((path) => path === null || !inPublic(path));
    expect(missing).toEqual([]);
  });
});

describe("demisLetterPortraitPath", () => {
  it("moves the old site's portrait path to this site's", () => {
    expect(demisLetterPortraitPath({ portrait: "/portraits/signatories/lords/kidron.jpg" })).toBe(
      "/images/dear-sir-demis-2025/portraits/lords/kidron.jpg",
    );
  });

  it("is null without a portrait, or with one from somewhere else", () => {
    expect(demisLetterPortraitPath({ portrait: null })).toBeNull();
    expect(demisLetterPortraitPath({})).toBeNull();
    expect(demisLetterPortraitPath({ portrait: "/elsewhere/kidron.jpg" })).toBeNull();
  });
});

describe("demisLetterDisplayType", () => {
  it("calls Lords and Baronesses peers, and the rest what they are", () => {
    expect(demisLetterDisplayType("Lord")).toBe("Peer");
    expect(demisLetterDisplayType("Baroness")).toBe("Peer");
    expect(demisLetterDisplayType("MSP")).toBe("MSP");
  });
});

describe("demisLetterDisplayName", () => {
  it("prefers the display name", () => {
    expect(
      demisLetterDisplayName({ name: "The Lord Bishop of Oxford", displayName: "Right Revd Dr Steven Croft" }),
    ).toBe("Right Revd Dr Steven Croft");
    expect(demisLetterDisplayName({ name: "Baroness Kidron" })).toBe("Baroness Kidron");
  });
});

describe("demisLetterOrganisations", () => {
  it("are the four that signed, in order, without PauseAI Global, each with a logo in public/", () => {
    const organisations = demisLetterOrganisations();
    expect(organisations.map((o) => o.name)).toEqual([
      "Open Rights Group",
      "Connected by Data",
      "Safe AI for Children Alliance",
      "Open Data Manchester",
    ]);
    for (const { logo, website } of organisations) {
      expect(inPublic(logo!.src), logo!.src).toBe(true);
      expect(website).toMatch(/^https:\/\//);
    }
  });

  it("put one they don't know last, with just its name", () => {
    const signatories = [
      { name: "Somebody New", type: "Organization" },
      { name: "Open Data Manchester", type: "Organization" },
      { name: "Open Rights Group", type: "Organization" },
    ];
    expect(demisLetterOrganisations(signatories)).toEqual([
      expect.objectContaining({ name: "Open Rights Group" }),
      expect.objectContaining({ name: "Open Data Manchester" }),
      { name: "Somebody New", website: null, logo: null },
    ]);
  });
});

describe("DEMIS_LETTER_QUOTES", () => {
  it("are each from a signatory, with their portrait", () => {
    const portraits = DEMIS_LETTER_SIGNATORIES.map((s) => demisLetterPortraitPath(s));
    for (const { name, portrait } of DEMIS_LETTER_QUOTES) expect(portraits, name).toContain(portrait);
  });
});
