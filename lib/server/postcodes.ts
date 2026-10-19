import "server-only";
import { constituencyName } from "@/lib/constituencies";
import type { Place } from "@/lib/events";
import { outsideFetch } from "./outside-fetch";

// postcodes.io: the UK's open postcode API, no key needed. It gives the
// constituency's name and its official code; we take the official name for
// the code (lib/constituencies.ts), since postcodes.io spells some differently.
// And where the postcode is, for suggesting events nearby.

export type ConstituencyResult =
  { ok: true; constituency: string; place?: Place } | { ok: false; reason: "not_found" | "no_constituency" | "failed" };

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
    const { latitude, longitude } = data.result;
    const place = typeof latitude === "number" && typeof longitude === "number" ? { latitude, longitude } : undefined;
    return {
      ok: true,
      constituency: (typeof code === "string" && constituencyName(code)) || name,
      ...(place && { place }),
    };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

export type PostcodePlaceResult =
  { ok: true; place: Place; name: string } | { ok: false; reason: "not_found" | "failed" };

/**
 * Where a postcode is, and its district's name ("Westminster"), for events
 * near it. The first half of one, an outcode ("M1"), will do: postcodes.io
 * gives its middle and the districts it reaches into, and we name the first.
 * Without a district, the name is the postcode as typed.
 */
export async function placeForPostcode(postcode: string): Promise<PostcodePlaceResult> {
  const code = postcode.trim();
  try {
    const full = await placeAt(`postcodes/${encodeURIComponent(code)}`, code);
    if (full.ok || full.reason === "failed") return full;
    return await placeAt(`outcodes/${encodeURIComponent(code)}`, code);
  } catch {
    return { ok: false, reason: "failed" };
  }
}

async function placeAt(path: string, code: string): Promise<PostcodePlaceResult> {
  const res = await outsideFetch(`https://api.postcodes.io/${path}`);
  if (res.status === 404) return { ok: false, reason: "not_found" };
  if (!res.ok) return { ok: false, reason: "failed" };
  const result = (await res.json())?.result;
  const { latitude, longitude } = result ?? {};
  if (typeof latitude !== "number" || typeof longitude !== "number") return { ok: false, reason: "not_found" };
  const district = [result.admin_district].flat()[0];
  return {
    ok: true,
    place: { latitude, longitude },
    name: typeof district === "string" && district ? district : code.toUpperCase(),
  };
}
