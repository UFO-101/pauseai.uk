# Who already supports the Sobel bill, from ControlAI's letter

Plan, 15 Oct 2026. Stages 1–4 and the list button built 15 Oct 2026 (copy is placeholders); the filter and the import page merge are not.

## Idea

https://controlai.org/uk-pm-letter lists the parliamentarians who signed Alex Sobel's letter to the PM about the Artificial Superintelligence Security Bill. An MP on it already supports the bill. An overnight job copies that list into our database, so `support-sobel-bill` knows who has already shown support.

Unlike the regulate letter, **nobody edits this status by hand**: it comes only from ControlAI's page, and the staff interface shows it but can't change it. The regulate letter's form stays as it is, with "signed" its only option.

## What we found (tmp/controlai/match.mjs, 15 Oct 2026)

- The page is a Framer site with no names in its HTML. It links the letter as a PDF (`https://images.controlai.com/final%20letter.pdf`), and the names are plain text in it, from "Yours sincerely" to the footer. A second block, "Since this letter was originally delivered... the following parliamentarians have also signed", follows, so the list changes.
- 86 names: 50 MPs and 36 peers. All 50 MPs match Airtable by name once titles and honours are stripped, one through a typo in the letter ("Hinchcliff" for Hinchliff). Peers are written in full ("Lord Goldsmith of Richmond Park") where Airtable is short ("Lord Goldsmith"): 24 match, 12 aren't in Airtable.

## Design

- **Specific to this campaign and this letter.** No general "status from a source" mechanism, no new campaign fields.
- **Status rows**: `campaign_statuses` with campaign `support-sobel-bill`, status `signed`, `updated_by` `controlai`. The constraint already allows it; everything that reads statuses works unchanged.
- **The overnight job** (`netlify/functions/import-controlai`, an hour after `check-mps`, posting to `app/api/cron/import-controlai`) fetches the page through `outsideFetch`, finds the PDF, extracts the text (`pdfjs-dist` or `unpdf`; `pdf-lib` can't), parses the names, and makes the table match: adds statuses, removes `controlai` ones no longer listed. It never touches the regulate letter's statuses. If the page or PDF fails, or fewer than 50 names parse, it throws and changes nothing.
- **Matching**: MPs by normalised name, one letter out allowed when that finds exactly one. Peers by short title, in `lords`. Anyone matching nobody or more than one is an error for a person to see, not set. Peers not in our table are reported, not added (the v2 plan has other signers added by hand).
- **Errors are shown**: each run is kept in `controlai_imports (at, matched, added, removed, errors jsonb)` and shown on `/staff/import` with a "run now" button, and logged to `audit_log` for `/staff/changes`. A failed run is kept too, with its message.
- **Politician page**: the bill gets no form, just a line saying whether they signed ControlAI's letter and when it was last checked. The status action and the Airtable import refuse `support-sobel-bill`.
- **The campaign page** keeps "always one to write": the status doesn't move the page on. When the MP signed, the page shows a note, and the letter itself changes: it thanks them for signing ControlAI's letter, then asks them to come to the debate. Both are placeholder copy until written. The campaign's `letter` takes whether they signed, alongside the salutation and constituency. A fourth test postcode finds such an MP.

## Stages

1. Parser and matcher, pure, in `lib/`, with the page and PDF as fixtures.
2. Import, migration, cron route and scheduled function, guards.
3. Staff: import section, politician page line.
4. Public: the note on the bill's page, the test MP.

## Tidier staff pages

Marking who signed the regulate letter is the main hand job. Today it's list → politician page → a form with status, date and note → save. Instead:

- **Mark as signed from the list.** The regulate letter's column on `/staff` shows ✓ and the date set, or a "Signed" button that sets it today. A second button, or the same one, unsets it. No date or note fields: the status form on the politician page goes, and with it the date and note. (The columns stay in the table for now; they can go in a later migration.)
- **The bill's column** shows ✓ "ControlAI" or nothing, with no button.
- **Find quickly**: add a "not yet signed" filter next to the search box, and sort by constituency.
- **Merge the Airtable import page into one "Imports" page**: MPs, ControlAI letter, and the one-off signatories import (which can go once it's been run), each with its last run and errors.

## Questions

1. Show the bill's supporters publicly on `/campaigns`, next to the regulate letter's signatories?
2. The list button and the import page merge: build with this, or after?
