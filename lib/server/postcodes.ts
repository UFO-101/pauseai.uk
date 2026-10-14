import "server-only";
import { constituencyName } from "@/lib/constituencies";
import { outsideFetch } from "./outside-fetch";

// postcodes.io: the UK's open postcode API, no key needed. It gives the
// constituency's name and its official code; we take the official name for
// the code (lib/constituencies.ts), since postcodes.io spells some differently.

export type ConstituencyResult =
  | { ok: true; constituency: string }
  | { ok: false; reason: "not_found" | "no_constituency" | "failed" };

export async function constituencyForPostcode(postcode: string): Promise<ConstituencyResult> {
  try {
    const res = await outsideFetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
    if (res.status === 404) return { ok: false, reason: "not_found" };
    if (!res.ok) return { ok: false, reason: "failed" };
    const data = await res.json();
    const name = data?.result?.parliamentary_constituency;
    if (typeof name !== "string" || !name) return { ok: false, reason: "no_constituency" };
    // The official name, from the code: postcodes.io's names can differ (lib/constituencies.ts).
    const code = data.result.codes?.parliamentary_constituency;
    return { ok: true, constituency: (typeof code === "string" && constituencyName(code)) || name };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
