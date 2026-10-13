import "server-only";
import { isTestPostcode, type Mp } from "@/lib/email-your-mp";
import { mpForConstituency, testMp } from "./mp-list";
import { constituencyForPostcode } from "./postcodes";

export type FindMpResult =
  | { ok: true; mp: Mp }
  | { ok: false; reason: "not_found" | "no_constituency" | "no_mp" | "failed" };

/** The MP for a postcode. ZZ99ZZ finds the test MP. */
export async function findMp(postcode: string): Promise<FindMpResult> {
  if (isTestPostcode(postcode)) return { ok: true, mp: testMp() };
  const found = await constituencyForPostcode(postcode.trim());
  if (!found.ok) return found;
  const mp = mpForConstituency(found.constituency);
  return mp ? { ok: true, mp } : { ok: false, reason: "no_mp" };
}
