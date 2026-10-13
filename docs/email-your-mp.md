# Email your MP

Version 2 of the tool, built at `/email-your-mp-v2` (plan:
`plans/email-your-mp-v2.md`). This page says where its code is and which
settings it needs.

## Code

- `lib/content/email-your-mp.ts`: the campaigns (letter, subject, "already
  done" wording, attachments) and every word the tool shows. All
  placeholders for now.
- `lib/email-your-mp.ts`: choosing a campaign and drafting the letter, shared
  by the form and the server.
- `lib/server/find-mp.ts`: postcode to MP. ZZ99ZZ finds the test MP.
- `lib/parliament.ts`: reads the sitting MPs from Parliament's Members API,
  and compares two lists of them.
- `lib/server/mp-letters.ts`: checks a letter from the form and sends it on.
- `app/(site)/email-your-mp-v2/`: the pages and the form.
- `app/api/email-your-mp/`: the form's lookup and send requests.

## MPs

`npm run data:mps` copies the sitting MPs from Parliament's Members API into
`data/mps.json`, which the tool reads. Check the diff and commit it. If more
than 20 MPs change at once, it stops and lists them for a person to check;
run it again with `-- --force` to write them.

Emails are the parliamentary office's where there is one, trimmed. Where
Parliament gives no salutation, one is built from the name: "Sir Iain" or
"Dame Margaret", else Mr or Ms and the surname, else the full name. Where
Parliament's salutation is the full name ("Stephen Kinnock"), it is kept.

## Settings

Environment variables, set in Netlify.

| Variable | What it's for |
| --- | --- |
| `TEST_MP_EMAIL` | Where the test MP's letters go. Without it, the test MP shows "no email listed". |
| `AIRTABLE_TOKEN` | Reads MPs' statuses and the signatories (already set). |
| `AIRTABLE_WRITE_API_KEY` | Writes letters to the Emails table, for the 8am automation to send. |
| `TURNSTILE_SECRET_KEY` | Checks the anti-spam token. Without it the form refuses every letter, except in `next dev`. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Draws the anti-spam widget. Read at build time. |

## Things to set up outside the code

- Airtable's parliamentarians table needs a record for the test MP, with
  `TEST_MP_EMAIL` as its Email, or letters to the test MP fail.
- The 8am automation should attach each campaign's PDFs according to the
  Campaign field. Letters for the bill campaign use the option "Alex Sobel
  bill", which Airtable creates the first time one is saved.
