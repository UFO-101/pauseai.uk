import { describe, expect, it } from "vitest";
import { constituencyName, isOfficialName } from "./constituencies";
import constituencies from "./constituencies.json";

describe("the official constituencies", () => {
  it("lists all 650, by code", () => {
    expect(Object.keys(constituencies)).toHaveLength(650);
    expect(new Set(Object.values(constituencies)).size).toBe(650);
  });

  it("names a constituency from its code, and nothing else", () => {
    expect(constituencyName("W07000102")).toBe("Montgomeryshire and Glyndŵr");
    expect(constituencyName("E14001172")).toBe("Cities of London and Westminster");
    expect(constituencyName("E14999999")).toBeUndefined();
    expect(constituencyName("toString")).toBeUndefined();
  });

  it("knows an official name exactly", () => {
    expect(isOfficialName("Ynys Môn")).toBe(true);
    expect(isOfficialName("Ynys Mon")).toBe(false);
    expect(isOfficialName("Montgomeryshire and Glyndwr")).toBe(false);
  });
});
