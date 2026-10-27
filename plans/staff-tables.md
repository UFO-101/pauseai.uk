# Staff tables, filters and the supporter page

Plan, 27 Oct 2026. Not built.

Designs: https://claude.ai/artifact/LiTTDqVJ1c9rPeDYfTEr5x. For lists, design 1, "Toolbar over and under", with striped rows. For a supporter's page, design C, "Profile column, activity tables". The others there were considered and not chosen.

## One list frame

Every list is drawn by one component, so a list never designs its own table again. A list says what its columns are, as data: each column's heading, its cell, its sort key if any, and its value as text for a download. From that the frame draws:

- **Over the table**: "250 politicians · showing 101–200", and on the right "Download all 250" with CSV and JSON buttons. On a phone the buttons wrap under the count.
- **The table**: `components/ui/Table`, striped: every other row `#faf5ef` (a new token) on a white table.
- **Under the table**: "101–200 of 250", then Previous, the page numbers and Next. With many pages, the first, the last and two either side of this one, with "…" between: `1 … 4 5 [6] 7 8 … 50`. On a phone, Previous, "Page 6 of 50", Next.

Nothing is shown for one page of results but the count and downloads.

The lists that use it: politicians, supporters, letters, both blocked-emails lists, mailings, asks, and the audit log. The audit log is one table, its date in a column of its own on the left, with paging but no filters or sorting yet.

Small tables inside a box (a mailing's recipients, an import's problems, accounts, sessions) stay a plain `Table`. They get the stripes, which are `Table`'s own, but no count or downloads.

## Width

A list's table, with its bars, runs past the content's 88rem cap to the right edge of the window. The heading and filters stay where they are. Short columns (house, party, status, dates, counts) never wrap; the long ones (names, constituencies, asks) take what's left. No sideways scroll on desktop yet.

The sidebar gets a fold button on every staff page. Folded, it's a strip of icons; the browser remembers which (localStorage).

## Downloads

CSV and JSON of every page the filters match, with the columns the table shows (the frame's text values). Anyone who can see a list can download it.

The filename says what, which filter and when, in lower case with underscores: `supporters_near_leicester_10_miles_2026_10_27_1430.csv`, `politicians_house_of_commons_party_labour_2026_10_27_1430.json`.

Each download of supporters goes in the audit log: who, when, the filter and how many rows, not the rows themselves.

## Filters

- **A pill can repeat** where that makes sense: party, status, country, a supporter's activity, subscription, event, campaign. The same filter twice means either: "Party: Labour" and "Party: Green" is anyone in either. Different filters must all match. An ask's answer doesn't repeat.
- **The structure.** Each list's filters become one validated value: a schema per list whose filters hold lists of values, with one function from the URL to it and back. The URL repeats a parameter for a repeated pill (`party=Labour&party=Green`). Phase 2 of `plans/politicians-and-mail.md` stores this value with a mailing.

### Supporters

- **Has phone**, **has email**.
- **Event**: one event, picked from a menu with a search box over the titles. "Registered", as Luma gives only registrations, not who came.
- **Campaign**: a campaign, then "wrote" or "didn't write".
- **Country**.
- **Near**: a postcode, a postcode's first half or a town, and 5, 10, 25 or 50 miles. The pill shows what it found: "Near: Newport, Wales, 10 miles". What's typed is looked up at postcodes.io: `/postcodes/{postcode}`, else `/outcodes/{outcode}`, else `/places?q=` taking the first city or town (each tried 27 Oct 2026).

### Politicians

- **Email**: has an address, has none, or its address is blocked.
- **Nation**, from the country stored for each.

Had letters and has replied are left for later (the columns sort); test MPs need no filter.

## Where a supporter is

Worked out when their data is imported, and stored with them: coordinates, a place name and the country, from

1. their newest postcode postcodes.io knows (place name: its `admin_district`);
2. else their city, looked up as a place;
3. else their newest Luma event that isn't tagged Big events or Online (place name: the event's city).

The Luma import starts storing each event's tags, which the site doesn't read now.

The supporters table gets a Place column, faint when it comes from an event; their page says what it's from ("Leicester, from their postcode").

## The supporters table

New columns: their newest phone, their newest email, and Place.

## A supporter's page

Design C. A narrow white column with everything about them: name and badges; email, phone and place, each with icon and where it came from; first seen, last active, member since; their subscriptions; Erase. Beside it, striped tables of their events and their letters, from the list frame. The whole history, folded, at the foot. Emails from PauseAI join it when we send supporters email.

Viewing a supporter is no longer logged; downloading supporters is.

## The fixture

The shared seed (`tests/fixtures/staff-data.sql`) gains made-up politicians to 250 in all, across houses and parties, so lists have three pages.

## Data protection

- `docs/data-protection.md`: the staff row says the audit log records downloads of supporters, not views; the safeguards that name the viewing log (lines 55 and 155 now) name the download log instead. A new row, or an addition to the supporters' row, for where a supporter is: coordinates, place name and country, worked out from their postcode, city or events, to find supporters near somewhere.
- postcodes.io is already a processor and keeps nothing. It now also gets supporters' postcodes and cities, and staff's searches.
- The privacy policy says we work out roughly where supporters are, to invite them to things near them.
- Erasure deletes the stored place with the rest.
