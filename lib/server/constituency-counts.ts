import "server-only";
import { constituencyCode } from "@/lib/constituencies";
import { LAYER_CAMPAIGNS, type ConstituencyRow } from "@/lib/constituency-map";
import { query } from "./db";
import { MP_CHOICES } from "./supporters";

// What the constituency map (/campaigns/constituencies) shows of each
// constituency. A supporter is counted in the constituency of the postcode
// that places them (supporter_place), as the supporters list's MP filter
// finds them; one placed only by a town or an event isn't counted. A letter
// is counted in the constituency of the MP it was sent to, test MPs left out.

type Counted = { constituency: string; supporters: number; frontier: number; sobel: number };

/**
 * Every constituency with a supporter, a letter sent or an MP in office:
 * its counts and its MP. A constituency with none of those isn't listed;
 * the map draws it empty.
 */
export async function constituencyCounts(): Promise<ConstituencyRow[]> {
  const [counted, mps] = await Promise.all([
    query<Counted>(
      `WITH supporters AS (
         SELECT pp.constituency, count(*)::int AS n FROM supporters_listed s
         JOIN postcode_places pp ON pp.postcode = upper(replace(s.given, ' ', ''))
         WHERE s.basis = 'postcode' AND pp.constituency IS NOT NULL GROUP BY pp.constituency
       ), letters AS (
         SELECT p.constituency,
           count(*) FILTER (WHERE f.campaign = $1)::int AS frontier,
           count(*) FILTER (WHERE f.campaign = $2)::int AS sobel
         FROM letters_from_supporters f JOIN letters l ON l.id = f.id
           JOIN politicians p ON p.id = l.notable_person_id
         WHERE l.status = 'sent' AND p.house = 'commons' AND NOT p.is_test AND p.constituency IS NOT NULL
         GROUP BY p.constituency
       )
       SELECT coalesce(s.constituency, l.constituency) AS constituency, coalesce(s.n, 0) AS supporters,
         coalesce(l.frontier, 0) AS frontier, coalesce(l.sobel, 0) AS sobel
       FROM supporters s FULL JOIN letters l ON l.constituency = s.constituency`,
      [LAYER_CAMPAIGNS.frontier, LAYER_CAMPAIGNS.sobel],
    ),
    query<{ constituency: string; name: string; party: string }>(
      `SELECT m.constituency, m.name, p.party FROM (${MP_CHOICES}) m JOIN politicians p ON p.id = m.id`,
    ),
  ]);
  const rows = new Map<string, ConstituencyRow>();
  const row = (name: string) => {
    const code = constituencyCode(name);
    if (!code) return undefined;
    const found = rows.get(code) ?? { code, supporters: 0, frontier: 0, sobel: 0, mp: null };
    rows.set(code, found);
    return found;
  };
  for (const { constituency, supporters, frontier, sobel } of counted) {
    Object.assign(row(constituency) ?? {}, { supporters, frontier, sobel });
  }
  for (const { constituency, name, party } of mps) {
    const found = row(constituency);
    if (found) found.mp = { name, party };
  }
  return [...rows.values()].sort((a, b) => a.code.localeCompare(b.code));
}
