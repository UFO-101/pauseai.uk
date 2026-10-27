import { describe, expect, it } from "vitest";
import { vcardCode, vcardFile } from "./vcard";

describe("vcardCode", () => {
  it("is four letters and digits that don't look alike", () => {
    expect(vcardCode(() => 0)).toBe("AAAA");
    expect(vcardCode(() => 0.999)).toBe("9999");
    expect(vcardCode()).toMatch(/^[A-HJKMNP-Z2-9]{4}$/);
  });
});

describe("vcardFile", () => {
  it("makes a card each, named with the code, with every field it has, escaped", () => {
    const file = vcardFile(
      [
        {
          name: "Francis Irving",
          emails: ["f@example.com", "old@example.com"],
          phones: ["+447700900001"],
          address: { locality: "Leeds", postcode: "LS1 1AA", country: "England" },
          org: "House of Commons",
          title: "Labour; Co-op",
          note: ["Activities: Member, Luma events", "Letters to MP: 2"],
          url: "/staff/supporters/7",
        },
        { name: null, emails: ["anon@example.com"], phones: [] },
        { name: null, emails: [], phones: [], address: {} },
      ],
      "AB3D",
      "https://pauseai.uk",
    );
    expect(file.split("\r\n")).toEqual([
      "BEGIN:VCARD",
      "VERSION:3.0",
      "FN:PauseAI AB3D - Francis Irving",
      "N:;PauseAI AB3D - Francis Irving;;;",
      "EMAIL;TYPE=INTERNET,PREF:f@example.com",
      "EMAIL;TYPE=INTERNET:old@example.com",
      "TEL;TYPE=CELL,PREF:+447700900001",
      "ADR;TYPE=HOME:;;;Leeds;;LS1 1AA;England",
      "ORG:House of Commons",
      "TITLE:Labour\\; Co-op",
      "NOTE:Activities: Member\\, Luma events\\nLetters to MP: 2",
      "URL:https://pauseai.uk/staff/supporters/7",
      "CATEGORIES:PauseAI",
      "END:VCARD",
      "BEGIN:VCARD",
      "VERSION:3.0",
      "FN:PauseAI AB3D - anon@example.com",
      "N:;PauseAI AB3D - anon@example.com;;;",
      "EMAIL;TYPE=INTERNET,PREF:anon@example.com",
      "CATEGORIES:PauseAI",
      "END:VCARD",
      "BEGIN:VCARD",
      "VERSION:3.0",
      "FN:PauseAI AB3D -",
      "N:;PauseAI AB3D -;;;",
      "CATEGORIES:PauseAI",
      "END:VCARD",
      "",
    ]);
  });

  it("folds a long line at 75 bytes, each further line starting with a space, and escapes backslashes", () => {
    const note = `${"é".repeat(60)}\\`;
    const file = vcardFile([{ name: "A", emails: [], phones: [], note: [note] }], "AAAA", "https://pauseai.uk");
    const lines = file.split("\r\n");
    const start = lines.findIndex((line) => line.startsWith("NOTE:"));
    expect(new TextEncoder().encode(lines[start]).length).toBeLessThanOrEqual(75);
    expect(lines[start + 1].startsWith(" ")).toBe(true);
    expect(new TextEncoder().encode(lines[start + 1]).length).toBeLessThanOrEqual(75);
    const end = lines.findIndex((line, i) => i > start && !line.startsWith(" "));
    expect(
      lines
        .slice(start, end)
        .map((line, i) => (i ? line.slice(1) : line))
        .join(""),
    ).toBe(`NOTE:${note.replace("\\", "\\\\")}`);
  });
});
