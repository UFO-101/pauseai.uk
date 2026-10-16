import { describe, expect, it } from "vitest";
import { SOBEL_BILL_CAMPAIGN } from "./controlai-letter";
import { campaignBySlug, normalisePostcode } from "./email-your-mp";
import { TEST_MPS } from "./test-mps";

describe("test MPs", () => {
  it("have distinct, normalised postcodes, and statuses for real campaigns", () => {
    const postcodes = TEST_MPS.map((mp) => mp.postcode);
    expect(new Set(postcodes).size).toBe(postcodes.length);
    for (const mp of TEST_MPS) {
      expect(normalisePostcode(mp.postcode)).toBe(mp.postcode);
      for (const [slug, status] of Object.entries(mp.statuses)) {
        // The bill's "signed" means they signed ControlAI's letter backing it (lib/controlai-letter.ts).
        expect(slug === SOBEL_BILL_CAMPAIGN ? "signed" : campaignBySlug(slug)?.done).toBe(status);
      }
    }
  });
});
