import "server-only";
import { outsideFetch } from "./outside-fetch";

// postcodes.io: the UK's open postcode API, no key needed.

export type ConstituencyResult =
  | { ok: true; constituency: string }
  | { ok: false; reason: "not_found" | "no_constituency" | "failed" };

export async function constituencyForPostcode(postcode: string): Promise<ConstituencyResult> {
  try {
    const res = await outsideFetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
    if (res.status === 404) return { ok: false, reason: "not_found" };
    if (!res.ok) return { ok: false, reason: "failed" };
    const data = await res.json();
    const constituency = data?.result?.parliamentary_constituency;
    if (typeof constituency !== "string" || !constituency) return { ok: false, reason: "no_constituency" };
    return { ok: true, constituency };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
