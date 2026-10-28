import "server-only";
import type { PlacesLookup } from "@/lib/import-runs";
import { query, type Queryable } from "./db";
import { placeNamed, placesForPostcodes, POSTCODES_AT_ONCE, type FoundPlace } from "./outside-services/postcodes";

// Where supporters are (the supporter_place view): each postcode and town
// they or their events gave, and each postcode's constituency, looked up at
// postcodes.io once, and kept, at
// the end of each Luma import (luma-import.ts). A run looks up a few hundred
// postcodes and a few dozen towns, so a big import catches up over a few
// hours rather than holding up one run.

/** How many postcodes and towns a run looks up, at most. */
const POSTCODES_A_RUN = 5 * POSTCODES_AT_ONCE;
const TOWNS_A_RUN = 40;

/** Stores a town found, or that there's none, under its name. */
async function storeTown(name: string, found: FoundPlace | null, db?: Queryable) {
  await query(
    `INSERT INTO named_places (name, latitude, longitude, place, country) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
    [name, found?.latitude ?? null, found?.longitude ?? null, found?.place ?? null, found?.country ?? null],
    db,
  );
}

/** Stores a postcode found, with its constituency, or that there's none, over what an earlier lookup stored. */
async function storePostcode(postcode: string, found: FoundPlace | null, db?: Queryable) {
  await query(
    `INSERT INTO postcode_places (postcode, latitude, longitude, place, country, constituency, constituency_checked)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     ON CONFLICT (postcode) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
       place = EXCLUDED.place, country = EXCLUDED.country, constituency = EXCLUDED.constituency,
       constituency_checked = true, looked_up_at = now()`,
    [
      postcode,
      found?.latitude ?? null,
      found?.longitude ?? null,
      found?.place ?? null,
      found?.country ?? null,
      found?.constituency ?? null,
    ],
    db,
  );
}

/**
 * Looks up the postcodes supporters gave and the towns they gave or their
 * events were in that haven't been looked up yet, and stores what
 * postcodes.io says of each. If postcodes.io fails, stops and says so,
 * keeping what it stored; the next run carries on. In `db`, a run's
 * transaction, if given.
 */
export async function lookUpPlaces(db?: Queryable): Promise<PlacesLookup> {
  const result: PlacesLookup = { postcodes: 0, towns: 0, failed: false };
  const postcodes = (
    await query<{ postcode: string }>(
      `SELECT DISTINCT upper(replace(c.postcode, ' ', '')) AS postcode FROM supporter_contact c
       WHERE c.postcode IS NOT NULL AND upper(replace(c.postcode, ' ', '')) <> ''
         AND NOT EXISTS (
           SELECT 1 FROM postcode_places p WHERE p.postcode = upper(replace(c.postcode, ' ', '')) AND p.constituency_checked
         )
       ORDER BY 1 LIMIT $1`,
      [POSTCODES_A_RUN],
      db,
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
      db,
    )
  ).map((row) => row.name);
  try {
    for (let i = 0; i < postcodes.length; i += POSTCODES_AT_ONCE) {
      const found = await placesForPostcodes(postcodes.slice(i, i + POSTCODES_AT_ONCE));
      for (const [postcode, place] of found) await storePostcode(postcode, place, db);
      result.postcodes += found.size;
    }
    for (const town of towns) {
      await storeTown(town, await placeNamed(town), db);
      result.towns++;
    }
  } catch {
    result.failed = true;
  }
  return result;
}
