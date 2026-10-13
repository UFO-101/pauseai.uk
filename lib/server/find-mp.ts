import "server-only";
import { isTestPostcode } from "@/lib/email-your-mp";
import { findSittingMp, findTestMp, type FoundMp } from "./politicians";
import { constituencyForPostcode } from "./postcodes";

export type FindMpResult =
  | { ok: true; mp: FoundMp }
  | { ok: false; reason: "not_found" | "no_constituency" | "no_mp" | "failed" };

/**
 * The MP for a postcode, from the politicians table. ZZ99ZZ finds the test
 * MP. Recipients must be in that table: the server looks the MP up again
 * from the sender's postcode, and never takes an address from the form.
 */
export async function findMp(postcode: string): Promise<FindMpResult> {
  try {
    if (isTestPostcode(postcode)) {
      const mp = await findTestMp();
      return mp ? { ok: true, mp } : { ok: false, reason: "no_mp" };
    }
    const found = await constituencyForPostcode(postcode.trim());
    if (!found.ok) return found;
    const mp = await findSittingMp(found.constituency);
    return mp ? { ok: true, mp } : { ok: false, reason: "no_mp" };
  } catch (error) {
    console.error("Couldn't look up the MP:", error);
    return { ok: false, reason: "failed" };
  }
}
