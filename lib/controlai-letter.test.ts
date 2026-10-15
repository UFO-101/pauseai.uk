import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { matchSignatories, nameKeys, normaliseName, oneLetterOut, pdfUrlIn, signatoriesIn } from "./controlai-letter";

// The letter's text as unpdf extracts it, on 15 Oct 2026.
const LETTER = readFileSync(new URL("../tests/fixtures/controlai-letter.txt", import.meta.url), "utf8");

describe("pdfUrlIn", () => {
  it("finds the letter's PDF in the page", () => {
    const html = `<a href="https://images.controlai.com/final%20letter.pdf">Download</a> <a href="https://x.com/ControlAI">`;
    expect(pdfUrlIn(html)).toBe("https://images.controlai.com/final%20letter.pdf");
    expect(pdfUrlIn("<p>No letter</p>")).toBeUndefined();
  });
});

describe("signatoriesIn", () => {
  it("reads the names after the sign-off, up to the footer, noting who signed later", () => {
    const signatories = signatoriesIn(LETTER);
    expect(signatories).toHaveLength(86);
    expect(signatories[0]).toEqual({ name: "Alex Sobel MP", addedLater: false });
    expect(signatories[70]).toEqual({ name: "The Rt Hon. the Baroness Foster of Aghadrumsee DBE", addedLater: false });
    expect(signatories[71]).toEqual({ name: "Dr Allison Gardner MP", addedLater: true });
    expect(signatories.at(-1)).toEqual({ name: "Sarah Dyke MP", addedLater: true });
    expect(signatories.filter((s) => s.addedLater)).toHaveLength(15);
    expect(signatories.some((s) => /Powered by|also signed|Since this/.test(s.name))).toBe(false);
  });

  it("takes everything to the end without a footer, and nothing without a sign-off", () => {
    expect(signatoriesIn("Dear PM,\nYours sincerely\nA Person MP\n\nLord B\n")).toEqual([
      { name: "A Person MP", addedLater: false },
      { name: "Lord B", addedLater: false },
    ]);
    expect(signatoriesIn("Dear PM,\nA Person MP")).toEqual([]);
  });
});

describe("names", () => {
  it("strips titles, honours and MP", () => {
    expect(normaliseName("The Rt Hon Sir John Hayes MP")).toBe("john hayes");
    expect(normaliseName("Rt. Hon Baroness D’Souza CMG")).toBe("baroness d'souza");
    expect(normaliseName("Baroness Benjamin, OM DBE")).toBe("baroness benjamin");
    expect(normaliseName("Lord (Mike) Watson of Invergowrie")).toBe("lord watson of invergowrie");
    expect(normaliseName("Dr Allison Gardner")).toBe("allison gardner");
  });

  it("knows a peer by the short title too, and an MP with or without hyphens", () => {
    expect(nameKeys("Rt Hon. the Lord Goldsmith of Richmond Park")).toEqual([
      "lord goldsmith of richmond park",
      "lord goldsmith",
    ]);
    expect(nameKeys("Lord Brian Mackenzie of Framwellgate OBE")).toEqual([
      "lord brian mackenzie of framwellgate",
      "lord mackenzie",
      "lord mackenzie of framwellgate",
    ]);
    expect(nameKeys("Baroness Berger of Barn Hill")).toEqual([
      "baroness berger of barn hill",
      "baroness berger",
      "lady berger",
      "lady berger of barn hill",
    ]);
    expect(nameKeys("Lady Berger")).toEqual(["lady berger", "baroness berger"]);
    expect(nameKeys("Rt Rev. the Lord Bishop of Hereford")).toEqual(["lord bishop of hereford"]);
    expect(nameKeys("Neil Duncan-Jordan MP")).toEqual(["neil duncan-jordan", "neil duncan jordan"]);
    expect(nameKeys("Lord")).toEqual(["lord"]);
  });

  it("allows one letter out", () => {
    expect(oneLetterOut("chris hinchcliff", "chris hinchliff")).toBe(true);
    expect(oneLetterOut("chris hinchliff", "chris hinchcliff")).toBe(true);
    expect(oneLetterOut("sam smith", "sam smyth")).toBe(true);
    expect(oneLetterOut("sam smith", "sam smith")).toBe(true);
    expect(oneLetterOut("sam smith", "sam smythe")).toBe(false);
    expect(oneLetterOut("sam", "samuel")).toBe(false);
  });
});

describe("matchSignatories", () => {
  const candidates = [
    { id: 1, house: "commons", name: "Chris Hinchliff" },
    { id: 2, house: "commons", name: "Sir John Hayes" },
    { id: 3, house: "lords", name: "Lord Goldsmith" },
    { id: 4, house: "lords", name: "Lord Watson of Invergowrie" },
    // Two MPs of the same name, in different seats.
    { id: 5, house: "commons", name: "Jon Hayes" },
    { id: 6, house: "commons", name: "Jon Hayes" },
    { id: 7, house: "lords", name: "The Lord Bishop of Oxford" },
    { id: 8, house: "lords", name: "The Lord Bishop of Leeds" },
    { id: 9, house: "commons", name: "John Smith" },
    { id: 10, house: "lords", name: "Lord Smith" },
  ];

  it("matches MPs by name, one letter out at most, and peers by either form of their title", () => {
    const { matched, problems } = matchSignatories(
      [
        { name: "Chris Hinchcliff MP", addedLater: false },
        { name: "The Rt Hon Sir John Hayes MP", addedLater: false },
        { name: "Rt Hon. the Lord Goldsmith of Richmond Park", addedLater: false },
        { name: "Lord (Mike) Watson of Invergowrie", addedLater: true },
      ],
      candidates,
    );
    expect([...matched.keys()]).toEqual([1, 2, 3, 4]);
    expect(matched.get(4)).toEqual({ name: "Lord (Mike) Watson of Invergowrie", addedLater: true });
    expect(problems).toEqual([]);
  });

  it("reports a name nobody has, or several could have, and never guesses", () => {
    const { matched, problems } = matchSignatories(
      [
        { name: "Baroness Nobody", addedLater: false },
        { name: "Jon Hayes MP", addedLater: false },
        { name: "Rt Rev. the Lord Bishop of Hereford", addedLater: false },
        { name: "Lord Smith of Somewhere", addedLater: false },
      ],
      candidates,
    );
    expect([...matched.keys()]).toEqual([10]);
    expect(problems).toEqual([
      { name: "Baroness Nobody", kind: "nobody", candidates: [] },
      { name: "Jon Hayes MP", kind: "several", candidates: ["Jon Hayes", "Jon Hayes"] },
      { name: "Rt Rev. the Lord Bishop of Hereford", kind: "nobody", candidates: [] },
    ]);
  });

  it("matches an MP only to the Commons, and a peer only to the Lords", () => {
    const { matched, problems } = matchSignatories(
      [
        { name: "Lord Hinchliff", addedLater: false },
        { name: "John Smith MP", addedLater: false },
      ],
      candidates,
    );
    expect([...matched.keys()]).toEqual([9]);
    expect(problems).toEqual([{ name: "Lord Hinchliff", kind: "nobody", candidates: [] }]);
  });
});
