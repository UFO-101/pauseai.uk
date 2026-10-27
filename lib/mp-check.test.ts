import { describe, expect, it } from "vitest";
import { type AirtableMp, checkAgainstParliament, plainName } from "./mp-check";
import type { ParliamentMp } from "./parliament";

const ours = (constituency: string, name: string, email: string | null): AirtableMp => ({ name, constituency, email });
const theirs = (constituency: string, name: string, emails: string[]): ParliamentMp => ({
  parliamentId: 1,
  name,
  constituency,
  emails,
});

describe("plainName", () => {
  it("ignores titles, MP, spacing and case", () => {
    expect(plainName("Dr Ellie Chowns")).toBe("ellie chowns");
    expect(plainName("The Rt Hon Sir  Iain Duncan Smith MP")).toBe("iain duncan smith");
    expect(plainName("Mrs. Sureena Brackenridge")).toBe("sureena brackenridge");
    expect(plainName("Louise Sandher-Jones")).toBe("louise sandher-jones");
  });
});

describe("checkAgainstParliament", () => {
  it("finds nothing wrong when they agree, whatever the titles and case", () => {
    expect(
      checkAgainstParliament(
        [ours("Ipswich", "Ian Instance", "Ian.Instance.MP@parliament.uk")],
        [theirs("Ipswich", "Mr Ian Instance", ["ian.instance.mp@parliament.uk", "x@example.org"])],
      ),
    ).toEqual([]);
  });

  it("lists constituencies only one side has, different names and emails, by constituency", () => {
    const problems = checkAgainstParliament(
      [
        ours("Aldershot", "Zed", "z@parliament.uk"),
        ours("North East Derbyshire", "Louise Jones", "louise.jones.mp@parliament.uk"),
        ours("Gone", "Former MP", "f@parliament.uk"),
        ours("Wallasey", "Angela Eagle", null),
      ],
      [
        theirs("Aldershot", "Zed", ["z@parliament.uk"]),
        theirs("North East Derbyshire", "Louise Sandher-Jones", ["louise.sandherjones.mp@parliament.uk"]),
        theirs("New Seat", "New MP", []),
        theirs("Wallasey", "Dame Angela Eagle", ["angela.eagle.mp@parliament.uk"]),
      ],
    );
    expect(problems).toEqual([
      { kind: "unofficial", constituency: "Gone", airtable: "Former MP" },
      { kind: "extra", constituency: "Gone", airtable: "Former MP" },
      { kind: "missing", constituency: "New Seat", parliament: "New MP" },
      {
        kind: "name",
        constituency: "North East Derbyshire",
        airtable: "Louise Jones",
        parliament: "Louise Sandher-Jones",
      },
      {
        kind: "email",
        constituency: "North East Derbyshire",
        name: "Louise Jones",
        airtable: "louise.jones.mp@parliament.uk",
        parliament: ["louise.sandherjones.mp@parliament.uk"],
      },
      {
        kind: "email",
        constituency: "Wallasey",
        name: "Angela Eagle",
        airtable: null,
        parliament: ["angela.eagle.mp@parliament.uk"],
      },
    ]);
  });

  it("flags a constituency Airtable doesn't spell as the official list does", () => {
    expect(
      checkAgainstParliament(
        [ours("Montgomeryshire and Glyndwr", "Steve Witherden", "s@parliament.uk")],
        [theirs("Montgomeryshire and Glyndwr", "Steve Witherden", [])],
      ),
    ).toEqual([{ kind: "unofficial", constituency: "Montgomeryshire and Glyndwr", airtable: "Steve Witherden" }]);
    expect(
      checkAgainstParliament(
        [ours("Montgomeryshire and Glyndŵr", "Steve Witherden", "s@parliament.uk")],
        [theirs("Montgomeryshire and Glyndŵr", "Steve Witherden", [])],
      ),
    ).toEqual([]);
  });

  it("takes Airtable's email where Parliament lists none", () => {
    expect(
      checkAgainstParliament(
        [ours("West Tyrone", "Órfhlaith Begley", "o@sinnfein.ie")],
        [theirs("West Tyrone", "Órfhlaith Begley", [])],
      ),
    ).toEqual([]);
  });
});
