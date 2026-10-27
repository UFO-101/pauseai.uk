import { describe, expect, it } from "vitest";
import { CONTROLAI_LETTER_ASK } from "./asks";
import { campaignForAsk, normalisePostcode } from "./email-your-mp";
import { TEST_MPS } from "./test-mps";

describe("test MPs", () => {
  it("have distinct, normalised postcodes, and statuses for the asks of real campaigns", () => {
    const postcodes = TEST_MPS.map((mp) => mp.postcode);
    expect(new Set(postcodes).size).toBe(postcodes.length);
    for (const mp of TEST_MPS) {
      expect(normalisePostcode(mp.postcode)).toBe(mp.postcode);
      for (const [ask, status] of Object.entries(mp.statuses)) {
        // The bill's campaign is never done, but its ask, ControlAI's letter, can be signed.
        expect(ask === CONTROLAI_LETTER_ASK ? "signed" : campaignForAsk(ask)?.done).toBe(status);
      }
    }
  });
});
