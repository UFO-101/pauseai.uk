import { describe, expect, it } from "vitest";
import { campaigns, copy } from "@/lib/content/email-your-mp";
import {
  addressLines,
  campaignBySlug,
  campaignForAsk,
  campaignPath,
  campaignToMoveTo,
  chooseCampaign,
  trackedAsks,
  trackedCampaigns,
  draftLetter,
  isDone,
  looksLikeEmail,
  displayPostcode,
  normalisePostcode,
  signatureAddress,
} from "./email-your-mp";
import { docFromMarkup, toHtml, toText } from "./letter-format";

const [letterToPm, bill] = campaigns;
const ADDRESS = ["1 High St", "SW1A 1AA"];
const details = {
  salutation: "Ms Dummy",
  constituency: "Hackney North",
  senderName: "Jane Smith",
  statuses: {},
};

describe("postcodes", () => {
  it("compares postcodes without spaces or case", () => {
    expect(normalisePostcode(" sw1a  1aa ")).toBe("SW1A1AA");
    expect(displayPostcode(" sw1a  1aa ")).toBe("SW1A 1AA");
    expect(displayPostcode("M11AE")).toBe("M1 1AE");
    expect(displayPostcode("ab1")).toBe("AB1");
  });
});

describe("campaigns", () => {
  it("finds a campaign by slug", () => {
    expect(campaignBySlug(bill.slug)).toBe(bill);
    expect(campaignBySlug("nope")).toBeUndefined();
  });

  it("counts a campaign done only with the status it asks for", () => {
    expect(isDone(letterToPm, { [letterToPm.ask!]: "signed" })).toBe(true);
    expect(isDone(letterToPm, { [bill.ask!]: "signed" })).toBe(false);
    expect(isDone(letterToPm, {})).toBe(false);
  });

  it("never counts a campaign without a done status as done", () => {
    expect(bill.done).toBeUndefined();
    expect(isDone(bill, {})).toBe(false);
    expect(isDone(bill, { [bill.ask!]: "signed" })).toBe(false);
  });

  it("leaves campaigns nobody has done out of the staff interface, which records their asks", () => {
    expect(trackedCampaigns).toEqual([letterToPm]);
    expect(trackedAsks).toEqual(["frontier-ai-letter"]);
  });

  it("finds the campaign that makes an ask", () => {
    expect(campaignForAsk("controlai-letter")).toBe(bill);
    expect(campaignForAsk("deepmind-letter")).toBeUndefined();
  });

  it("ends with a campaign nobody has done, so there's always one to move on to", () => {
    expect(campaigns.at(-1)!.done).toBeUndefined();
  });

  it("picks the first campaign the MP hasn't done", () => {
    expect(chooseCampaign({})).toBe(letterToPm);
    expect(chooseCampaign({ [letterToPm.ask!]: "signed" })).toBe(bill);
  });

  it("moves on from a campaign the MP has done to the first they haven't", () => {
    expect(campaignToMoveTo(letterToPm, {})).toBeUndefined();
    expect(campaignToMoveTo(letterToPm, { [letterToPm.ask!]: "signed" })).toBe(bill);
    expect(campaignToMoveTo(bill, { [letterToPm.ask!]: "signed", [bill.ask!]: "signed" })).toBeUndefined();
  });

  it("has a page for each campaign", () => {
    expect(campaignPath(bill)).toBe("/campaigns/support-sobel-bill");
  });
});

describe("letters", () => {
  it("starts each campaign's letter with the MP's details", () => {
    for (const campaign of campaigns) {
      const draft = draftLetter(campaign, details, ADDRESS);
      expect(draft.content.slice(0, -1)).toEqual(docFromMarkup(campaign.letter(details)).content);
      expect(toText(draft)).toContain("Ms Dummy");
      expect(toText(draft)).toContain("Hackney North");
    }
  });

  it("thanks an MP who signed ControlAI's letter, in the bill's letter only, and still asks them to the debate", () => {
    const signed = { ...details, statuses: { [bill.ask!]: "signed" as const } };
    expect(toText(draftLetter(bill, signed, ADDRESS))).toContain(copy.sobelBill.letterThanks);
    expect(toText(draftLetter(bill, signed, ADDRESS))).toContain("second reading debate");
    expect(toText(draftLetter(bill, details, ADDRESS))).not.toContain(copy.sobelBill.letterThanks);
    expect(toText(draftLetter(letterToPm, signed, ADDRESS))).not.toContain(copy.sobelBill.letterThanks);
  });

  it("ends each draft with the sender's name, then their address, a line each", () => {
    for (const campaign of campaigns) {
      const draft = draftLetter(campaign, details, ADDRESS);
      expect(toText(draft).endsWith("\n\nJane Smith\n\n1 High St\nSW1A 1AA")).toBe(true);
      expect(toHtml(draft).endsWith("<p>Jane Smith</p>\n<p>1 High St<br>SW1A 1AA</p>")).toBe(true);
    }
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
