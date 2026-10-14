import { describe, expect, it } from "vitest";
import { campaigns } from "@/lib/content/email-your-mp";
import {
  addressLines,
  campaignBySlug,
  campaignPath,
  campaignToMoveTo,
  chooseCampaign,
  doneAll,
  draftLetter,
  fullLetter,
  isDone,
  looksLikeEmail,
  normalisePostcode,
  signatureAddress,
} from "./email-your-mp";
import { docFromMarkup, toHtml, toText } from "./letter-format";

const [letterToPm, bill] = campaigns;
const details = { salutation: "Ms Abbott", constituency: "Hackney North", senderName: "Jane Smith" };

describe("postcodes", () => {
  it("compares postcodes without spaces or case", () => {
    expect(normalisePostcode(" sw1a  1aa ")).toBe("SW1A1AA");
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

  it("moves on from a campaign the MP has done to the first they haven't, if any", () => {
    expect(campaignToMoveTo(letterToPm, {})).toBeUndefined();
    expect(campaignToMoveTo(letterToPm, { [letterToPm.slug]: "signed" })).toBe(bill);
    expect(campaignToMoveTo(bill, { [bill.slug]: "supports" })).toBe(letterToPm);
    expect(campaignToMoveTo(letterToPm, { [letterToPm.slug]: "signed", [bill.slug]: "supports" })).toBeUndefined();
  });

  it("knows when the MP has done every campaign", () => {
    expect(doneAll({ [letterToPm.slug]: "signed" })).toBe(false);
    expect(doneAll({ [letterToPm.slug]: "signed", [bill.slug]: "supports" })).toBe(true);
  });

  it("has a page for each campaign", () => {
    expect(campaignPath(bill)).toBe("/campaigns-v2/support-sobel-bill");
  });
});

describe("letters", () => {
  it("starts each campaign's letter with the MP's details", () => {
    for (const campaign of campaigns) {
      const draft = draftLetter(campaign, details);
      expect(draft).toEqual(docFromMarkup(campaign.letter(details)));
      expect(toText(draft)).toContain("Ms Abbott");
      expect(toText(draft)).toContain("Hackney North");
    }
  });

  it("signs the letter with the sender's name and address", () => {
    const signed = fullLetter(docFromMarkup("Dear MP,\n\nThanks,\n\n"), "Jane Smith", ["1 High St", "SW1A 1AA"]);
    expect(toText(signed)).toBe("Dear MP,\n\nThanks,\n\nJane Smith\n1 High St\nSW1A 1AA");
    expect(toHtml(signed)).toBe("<p>Dear MP,</p>\n<p>Thanks,</p>\n<p>Jane Smith<br>1 High St<br>SW1A 1AA</p>");
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
