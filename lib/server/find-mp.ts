import "server-only";
import { normalisePostcode } from "@/lib/email-your-mp";
import type { Place } from "@/lib/events";
import { TEST_MPS } from "@/lib/test-mps";
import { findMpInOffice, findTestMp, type FoundMp } from "./politicians";
import { constituencyForPostcode } from "./outside-services/postcodes";

export type FindMpResult =
  | { ok: true; mp: FoundMp; place?: Place }
  | { ok: false; reason: "not_found" | "no_constituency" | "no_mp" | "failed" };

/**
 * The MP for a postcode, from the politicians table. A test MP's postcode
 * finds them (lib/test-mps.ts). Recipients must be in that table: the server looks the MP up again
 * from the sender's postcode, and never takes an address from the form.
 * With where the postcode is, when known.
 */
export async function findMp(postcode: string): Promise<FindMpResult> {
  try {
    const test = TEST_MPS.find((mp) => mp.postcode === normalisePostcode(postcode));
    if (test) {
      const mp = await findTestMp(test.postcode);
      return mp ? { ok: true, mp, place: test.place } : { ok: false, reason: "no_mp" };
    }
    const found = await constituencyForPostcode(postcode.trim());
    if (!found.ok) return found;
    const mp = await findMpInOffice(found.constituency);
    return mp ? { ok: true, mp, ...(found.place && { place: found.place }) } : { ok: false, reason: "no_mp" };
  } catch (error) {
    console.error("Couldn't look up the MP:", error);
    return { ok: false, reason: "failed" };
  }
}
