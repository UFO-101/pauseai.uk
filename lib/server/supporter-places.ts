import "server-only";
import { query } from "./db";
import { placeNamed, placesForPostcodes, POSTCODES_AT_ONCE, type FoundPlace } from "./outside-services/postcodes";

// Where supporters are (the supporter_place view): each postcode and town
// they or their events gave, looked up at postcodes.io once, and kept. A run
// looks up a few hundred postcodes and a few dozen towns, so a big import
// catches up over a few hours rather than holding up one run.

/** How many postcodes and towns a run looks up, at most. */
const POSTCODES_A_RUN = 5 * POSTCODES_AT_ONCE;
const TOWNS_A_RUN = 40;

export type PlacesLookup = { postcodes: number; towns: number; failed: boolean };

/** Stores a place found, or that there's none, under `key` in `table`. */
async function store(table: "postcode_places" | "named_places", key: string, found: FoundPlace | null) {
  await query(
    `INSERT INTO ${table} (${table === "postcode_places" ? "postcode" : "name"}, latitude, longitude, place, country)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
    [key, found?.latitude ?? null, found?.longitude ?? null, found?.place ?? null, found?.country ?? null],
  );
}

/**
 * Looks up the postcodes supporters gave and the towns they gave or their
 * events were in that haven't been looked up yet, and stores what
 * postcodes.io says of each. If postcodes.io fails, stops and says so,
 * keeping what it stored; the next run carries on.
 */
export async function lookUpPlaces(): Promise<PlacesLookup> {
  const result: PlacesLookup = { postcodes: 0, towns: 0, failed: false };
  const postcodes = (
    await query<{ postcode: string }>(
      `SELECT DISTINCT upper(replace(c.postcode, ' ', '')) AS postcode FROM supporter_contact c
       WHERE c.postcode IS NOT NULL AND upper(replace(c.postcode, ' ', '')) <> ''
         AND NOT EXISTS (SELECT 1 FROM postcode_places p WHERE p.postcode = upper(replace(c.postcode, ' ', '')))
       ORDER BY 1 LIMIT $1`,
      [POSTCODES_A_RUN],
    )
  ).map((row) => row.postcode);
  const towns = (
    await query<{ name: string }>(
      `SELECT DISTINCT lower(trim(city)) AS name FROM (
         SELECT city FROM supporter_contact WHERE source <> 'luma' UNION SELECT city FROM luma_events
       ) c
       WHERE c.city IS NOT NULL AND trim(c.city) <> ''
         AND NOT EXISTS (SELECT 1 FROM named_places n WHERE n.name = lower(trim(c.city)))
       ORDER BY 1 LIMIT $1`,
      [TOWNS_A_RUN],
    )
  ).map((row) => row.name);
  try {
    for (let i = 0; i < postcodes.length; i += POSTCODES_AT_ONCE) {
      const found = await placesForPostcodes(postcodes.slice(i, i + POSTCODES_AT_ONCE));
      for (const [postcode, place] of found) await store("postcode_places", postcode, place);
      result.postcodes += found.size;
    }
    for (const town of towns) {
      await store("named_places", town, await placeNamed(town));
      result.towns++;
    }
  } catch {
    result.failed = true;
  }
  return result;
}
