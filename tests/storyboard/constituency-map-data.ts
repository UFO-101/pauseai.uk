import constituencies from "@/lib/constituencies.json";
import { runSql } from "@/scripts/fresh-database.mjs";

// Made-up supporters, MPs and letters across the constituencies, for the
// constituency map's flows (constituency-map.spec.ts), the same every run.
// Supporters are in most constituencies, a few in many, as a real list
// would be; frontier AI letters have gone to about a third of MPs, the
// newer bill's to fewer. Cities of London and Westminster, where the
// fixture postcode SW1A 1AA is, has all three.

/** The constituency the fixture postcode SW1A 1AA is in. */
export const WESTMINSTER = "Cities of London and Westminster";

const PARTIES = ["Labour", "Conservative", "Liberal Democrat", "Reform UK", "Green", "SNP"];

/** A number from 0 to 1, the same for the same seed: a sine hash, enough to scatter counts. */
function scatter(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** How many of each a constituency has, by its place in the list. */
function counts(i: number, name: string) {
  if (name === WESTMINSTER) return { supporters: 42, frontier: 12, sobel: 4 };
  const has = (salt: number, share: number) => scatter(i * 3 + salt) < share;
  const many = (salt: number, most: number) => Math.floor(Math.exp(scatter(i * 5 + salt) * Math.log(most + 1)));
  return {
    supporters: has(1, 0.62) ? many(1, 60) : 0,
    frontier: has(2, 0.34) ? many(2, 14) : 0,
    sobel: has(3, 0.14) ? many(3, 6) : 0,
  };
}

/** Writes the made-up map into a flow's database. */
export function seedConstituencyMap(database: string): void {
  const seats = Object.values(constituencies)
    .map((name, i) => ({ name, party: PARTIES[i % PARTIES.length], ...counts(i, name) }))
    .filter((seat) => seat.supporters + seat.frontier + seat.sobel > 0);
  const values = seats
    .map((s) => `('${s.name.replace(/'/g, "''")}', '${s.party}', ${s.supporters}, ${s.frontier}, ${s.sobel})`)
    .join(",\n");
  runSql(
    database,
    `CREATE TEMP TABLE seats (name text, party text, supporters int, frontier int, sobel int);
     INSERT INTO seats VALUES ${values};
     INSERT INTO postcode_places (postcode, latitude, longitude, place, country, constituency, constituency_checked)
       SELECT 'MAP' || row_number() OVER (ORDER BY name), 51.5, -0.1, name, 'england', name, true
       FROM seats WHERE supporters > 0;
     DO $$
     DECLARE seat record; mp bigint; supporter bigint; letter bigint; entry bigint; member text; postcode text;
     BEGIN
       FOR seat IN SELECT * FROM seats ORDER BY name LOOP
         INSERT INTO notable_people (kind, airtable_id, name, salutation, email, status)
           VALUES ('politician', 'recMap' || md5(seat.name), 'MP for ' || seat.name, 'MP', NULL, 'in_office')
           RETURNING id INTO mp;
         INSERT INTO politicians (id, house, constituency, party) VALUES (mp, 'commons', seat.name, seat.party);
         SELECT p.postcode INTO postcode FROM postcode_places p WHERE p.constituency = seat.name;
         FOR n IN 1..seat.supporters LOOP
           member := 'recmap' || md5(seat.name) || n;
           INSERT INTO members (id, email, name, city, postcode, joined_at, created_at, keep_informed, share_permission, source_modified_at)
             VALUES (member, member || '@example.org', 'Map Supporter', 'Somewhere', postcode, now(), now(), true, true, now());
           INSERT INTO supporters DEFAULT VALUES RETURNING id INTO supporter;
           INSERT INTO supporter_links (supporter_id, member_id, matched_by, matched_value)
             VALUES (supporter, member, 'email', member || '@example.org');
         END LOOP;
         FOR n IN 1..(seat.frontier + seat.sobel) LOOP
           INSERT INTO letters (kind, notable_person_id, status, sent_at) VALUES ('supporter', mp, 'sent', now())
             RETURNING id INTO letter;
           INSERT INTO form_entries (form, name, email, address, postcode, contact_consent)
             VALUES ('email-your-mp', 'Map Writer', 'writer' || letter || '@example.org', '1 Example Street', 'SW1A 1AA', false)
             RETURNING id INTO entry;
           INSERT INTO letters_from_supporters (id, entry_id, campaign, subject, reply_hash)
             VALUES (letter, entry, CASE WHEN n <= seat.frontier THEN 'regulate-letter-pm' ELSE 'support-sobel-bill' END,
               'A letter', 'map-reply-' || letter);
         END LOOP;
       END LOOP;
     END $$;
     REFRESH MATERIALIZED VIEW supporters_list;`,
  );
}
