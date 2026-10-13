import { describe, expect, it } from "vitest";
import { campaigns } from "@/lib/content/email-your-mp";
import {
  addressLines,
  campaignBySlug,
  chooseCampaign,
  draftLetter,
  fullLetter,
  isDone,
  isTestPostcode,
  looksLikeEmail,
  normalisePostcode,
  signatureAddress,
} from "./email-your-mp";

const [letterToPm, bill] = campaigns;
const details = { salutation: "Ms Abbott", constituency: "Hackney North", senderName: "Jane Smith" };

describe("postcodes", () => {
  it("compares postcodes without spaces or case", () => {
    expect(normalisePostcode(" sw1a  1aa ")).toBe("SW1A1AA");
    expect(isTestPostcode("zz9 9zz")).toBe(true);
    expect(isTestPostcode("SW1A 1AA")).toBe(false);
  });
});

describe("campaigns", () => {
  it("finds a campaign by slug", () => {
    expect(campaignBySlug(bill.slug)).toBe(bill);
    expect(campaignBySlug("nope")).toBeUndefined();
  });

  it("counts a campaign done only with the status it asks for", () => {
    expect(isDone(letterToPm, { [letterToPm.slug]: "signed" })).toBe(true);
    expect(isDone(letterToPm, { [letterToPm.slug]: "supports" })).toBe(false);
    expect(isDone(letterToPm, {})).toBe(false);
  });

  it("picks the first campaign the MP hasn't done, or the first if they've done them all", () => {
    expect(chooseCampaign({})).toBe(letterToPm);
    expect(chooseCampaign({ [letterToPm.slug]: "signed" })).toBe(bill);
    expect(chooseCampaign({ [letterToPm.slug]: "signed", [bill.slug]: "supports" })).toBe(letterToPm);
  });
});

describe("letters", () => {
  it("asks an MP who hasn't done it, and thanks one who has", () => {
    for (const campaign of campaigns) {
      const ask = draftLetter(campaign, {}, details);
      const thanks = draftLetter(campaign, { [campaign.slug]: campaign.done }, details);
      expect(ask).toBe(campaign.letter(details));
      expect(thanks).toBe(campaign.thanks(details));
      expect(ask).not.toBe(thanks);
      for (const text of [ask, thanks]) {
        expect(text).toContain("Ms Abbott");
        expect(text).toContain("Hackney North");
      }
    }
  });

  it("signs the letter with the sender's name and address", () => {
    expect(fullLetter("Dear MP,\n\nThanks,\n\n", "Jane Smith", ["1 High St", "SW1A 1AA"])).toBe(
      "Dear MP,\n\nThanks,\n\nJane Smith\n1 High St\nSW1A 1AA",
    );
  });

  it("ends the address with the postcode, unless it's already there", () => {
    expect(signatureAddress("1 High St\nLondon", "sw1a 1aa ")).toEqual(["1 High St", "London", "SW1A 1AA"]);
    expect(signatureAddress("1 High St\nLondon SW1A1AA", "SW1A 1AA")).toEqual(["1 High St", "London SW1A1AA"]);
  });

  it("turns a typed address into lines", () => {
    expect(addressLines(" 1 High St \n\n London\nSW1A 1AA\n")).toEqual(["1 High St", "London", "SW1A 1AA"]);
  });

  it("catches emails that are obviously wrong", () => {
    expect(looksLikeEmail("jane@example.com")).toBe(true);
    expect(looksLikeEmail("jane@example")).toBe(false);
    expect(looksLikeEmail("jane example.com")).toBe(false);
  });
});
