# Letters to MPs, and threads with politicians

Two separate phases:

- **Phase 1, on this branch:** import the legacy letters, so each one's
  text, diff from its template, and replies show on its page. It also
  keeps every other thread with a politician in Joseph's mailbox, so Gmail
  is read only once, and policy@'s and joseph@'s new ones as they arrive.
  These are "one-off emails". It also gives campaigns their own pages, and
  adds a page of sent emails.
- **Phase 2, later and optional:** small improvements to the one-off emails,
  decided once they've been seen on the page.

"Politician" means all five houses: Commons, Lords, Scottish Parliament,
Senedd and Northern Ireland Assembly.

There are no outstanding questions for phase 1. Designs for its staff pages:
https://claude.ai/artifact/HWt1FMSz1XhgjWHvnkFHek

## Building phase 1

One big pull request on the branch `legacy-letters-import`, built in this order:
data protection docs, the import and one-off emails, campaigns, asks, sent
emails, with the "new" tag alongside them. There's no LLM in any of it.

**To test against real data,** in the gitignored `tmp/`:

- `tmp/env` has `AIRTABLE_TOKEN`, `PSQL_READONLY_CONNECTION_STRING` (production,
  read-only), and the read-only Google client's `READONLY_GOOGLE_CLIENT_ID`,
  `READONLY_GOOGLE_CLIENT_SECRET` and `READONLY_GMAIL_TOKEN_KEY`.
- `tmp/prod-gmail/gmail.mjs` reads joseph@ and policy@, read-only, using the
  tokens in `readonly-tokens.json`. Set `PACE_MS` to 500 or more, with few
  parallel requests. Gmail's limit is shared with the site, so check the
  `read-gmail` runs in `import_runs` for a 403 while it's going, and stop if one
  appears. Only read bodies of mail about policy or Parliament.
- Already fetched: `sent-bodies.jsonl` (Joseph's sent mail to politicians, with
  text), `received.jsonl` (headers of what he got from them),
  `joseph-archive.json` (headers of the group's mail), `policy-messages.json`,
  `at-emails.json` and `at-webform.json` (Airtable).
- The tests behind this plan's numbers: `join2.mjs` (joining letters to sent
  emails), `classify.mjs` (joining replies), `variants.mjs` and `wave.mjs`
  (templates), `form-test.mjs` (form text), `quotes.mjs` and `body-mp.mjs` (quoted
  text). `form-versions/` has the form's text at each commit, with `dates.txt`.

**To check while building:**

- That `sentToday` (`gmail-accounts.ts`) doesn't count imported rows, whose dates
  are old, against `GMAIL_DAILY_LIMIT`.
- How cleanly quoted text extracts, and whether a letter's August template can
  be told from its date. If not, its page says it was probably one of them.
- How much a 15-minute run gets through on production.

**Wording:** "new", "Ask to sign", "Ask to attend" and "From supporters" are
final, and the site's existing wording is reused where there is some. Other new
copy, including "One-off emails", is a placeholder for a person to write before
merging (`AGENTS.md`, "Never write final copy").

## What's in the data

Tested with production's read-only database, Airtable, and read-only
sign-ins to joseph@ and policy@. Results are in `tmp/prod-gmail/`, which
is gitignored. Joseph's Sent mail holds 6,198 emails to politicians.

### Legacy letters join to their sent emails

A letter joins a sent email to the politician's address, sent from 25
minutes before production's time to 5 seconds after it. Where several
fit, the sender's address or name picks the form letter's email.

| Letters | In production | Joined | Not joined |
| --- | --- | --- | --- |
| DeepMind mailing | 4,360 | 3,418 | 942 |
| Documentary | 703 | 701 | 2 |
| Westminster Hall | 341 | 339 | 2 |
| Edinburgh | 186 | 186 | 0 |
| Ben Lake's debate | 71 | 71 | 0 |
| CSRB | 12 | 11 | 1 |
| Frontier AI form letters | 611 | 610 | 1 |
| Liability form letters | 65 | 63 | 2 |
| DeepMind form letters | 19 | 19 | 0 |
| **Total** | **6,368** | **5,418** | **950** |

### Politicians' replies

Joseph received 2,618 emails from politicians' addresses. Most are
automatic, and most don't share a Gmail thread with the letter:

| How it joins | Automatic | From a person | Marked as a mailing list |
| --- | --- | --- | --- |
| Same Gmail thread | 16 | 256 | 8 |
| Names the letter's Message-ID | 1,747 | 2 | 0 |
| The politician, plus the letter's subject | 23 | 23 | 16 |
| Automatic, within 3 days of a letter | 157 | 0 | 0 |
| Wrote to them, on another subject: one-off | 62 | 55 | 12 |
| No letter to that address: one-off | 45 | 192 | 4 |

The group's archive adds 121 politicians' messages. 26 are in a letter's
thread. Of the other 95:

- 37 are automatic, of which 28 join by time alone;
- 49 are from a person: 34 join by the sender's address or name in the
  text, a quoted Sent time, or the politician having only one letter, and
  15 are one-off;
- 9 are from politicians with no form letter.

### Texts

pauseai.info's form text is in its public repo's history
(https://github.com/PauseAI/pauseai-website, `UKMPEmailForm.svelte`,
removed in b8d29de0), so the form letters' templates are exact. The
version live when a letter was sent was the best match for 717 of 718.
445 of the 718 are unchanged, and 472 have under 10% of their own words.

PauseAI's letters come down to a few sends with one text each, plus a
personal paragraph on most of DeepMind's. The table is below.

### Other findings

- **Gmail's limit is shared with the site.** About 4 full reads a second
  for Joseph's account made 3 of the site's reads of it fail with a 403,
  though it lost nothing. At up to 2 a second, none of the next 17 did.
- **Casework replies** come through a shared system, from the MP's address:
  Message-ID `@geopod-ismtpd-N`, `(Case Ref: XX00000)` in the subject, and
  usually no In-Reply-To.
- **The group rewrote the From** of many messages to
  `"'Some MP' via PauseAI UK" <policy@pauseai.uk>`, with the real sender in
  `X-Original-From` or `Reply-To`. Gmail then labels them as Sent, so that
  label doesn't mean it's from us.
- **Addresses:** offices also write from a staff address
  (`jane.smith@parliament.uk`) and an office address
  (`officeofjohndoe@parliament.uk`). Some politicians use personal
  addresses. `senedd.cymru` and `co.niassembly.gov.uk` are in use too.
- **Quoted messages:** 22 of the 294 messages in the group's archive and
  policy@ quote a politician's message we don't hold. 21 have a full
  From and Sent block to read it from.

## Phase 1: import the legacy letters

### Mailings and campaigns

A send becomes its own mailing, so the mailings list shows it and its
counts. Each keeps its ask, if it has one. The DeepMind mailings are told apart
by those phrases in their text, and each template has a slot for the personal
paragraph. Documentary's are told apart by subject and text.

| Mailing or campaign | Letters | Dates | Text | Change |
| --- | --- | --- | --- | --- |
| DeepMind: "by 30 June" | 955 | 4–19 Jun 2025 | Template + personal paragraph | New |
| DeepMind: "ten of your colleagues" | 356 | 20 Jun 2025 | Template | New |
| DeepMind: "join 25 of your colleagues" | 1,105 | 8–22 Jul 2025 | Template + personal paragraph | New |
| DeepMind: "join 40 of your colleagues" | 921 | 23 Jul–5 Aug 2025 | Template + personal paragraph | New |
| DeepMind: August, from the personal Gmail | 910 | 6–22 Aug 2025 | Rebuilt from quotes | New |
| DeepMind letter: the others | 113 + 15 | Jun–Aug 2025 | Each its own; 32 of the 113 unknown | Mailing 8; 15 emails added |
| Documentary: invitation to everyone | 634 | 20 Oct 2025 | Template | Mailing 4 |
| Documentary: invitation to signatories | 35 | 13 Oct 2025 | Template | New |
| Documentary: reminder to signatories | 34 | 20 Oct 2025 | Template | New |
| Westminster Hall | 341 + 9 | 5–9 Dec 2025 | Template | Mailing 5; 9 emails added |
| CSRB | 12 | 5 Jun 2026 | Template; 3 changed | Mailing 1 |
| Edinburgh | 186 | 12–14 Oct 2026 | Template | Mailing 2 |
| Ben Lake's debate | 71 | 26 Oct 2026 | Template | Mailing 3 |
| Stuart Russell panel: invitation to speak | 10 | Jun–Aug 2026 | Each its own | New |
| Stuart Russell panel: invitation to co-host | 8 | 13 Aug 2026 | Template | New |
| Conference in Parliament | 5 | 3 Sep 2026 | Each its own | New |
| Liability letter: Joseph's own | 14 | May–Jun 2026 | Each its own | New |
| Frontier AI letter: Joseph's own | 12 | Jun–Oct 2026 | Each its own | New |
| Frontier AI form letters | 611 | Jun–Oct 2026 | 6 form versions | Existing campaign |
| Liability form letters | 65 | May–Jun 2026 | 4 form versions | Existing campaign |
| DeepMind form letters | 19 | Jul–Sep 2025 | 2 form versions | Existing campaign |
| Site form, by Postmark | 47 | Oct–Nov 2026 | Copies of 42 are held | Existing campaigns |

New mailings have dates in `airtable_sent_between`, which the constraints
need for an imported mailing. Letters move to them by their text, not by
those dates. The Emails sync places a new record in the first dated mailing
by ID, so it stays with mailing 8.

No new asks. None of Documentary, Westminster Hall, CSRB, Ben Lake's
debate or liability has useful answers recorded: Airtable has 2 responses
to the Documentary and none for the others. Airtable's "London 2026 Panel"
has 4 ticks, too few to be worth one.

The politicians' sync copies Airtable's 49 "Declined DeepMind Letter" as
`declined` on `deepmind-letter`, beside the 63 signed. "Responded
DeepMind Letter" isn't copied, as it isn't an answer; replies show on the
letters.

### What's stored

- **Who a mailing went from:** the import sets `mailings.sent_from` from the
  sent emails: joseph@pauseai.info for DeepMind, Documentary and Westminster
  Hall; joseph@pauseai.uk for CSRB and Edinburgh; policy@pauseai.uk for Ben
  Lake's debate. The August DeepMind mailing has none.
- **A mailing's template:** its subject in `mailings.subject`, and a new
  `mailings.imported_text`, in `body`'s format. `body` itself can't be
  used: `body IS NOT NULL` is how the code recognises a mailing written on
  the site, and `mailings_imported_or_written` forbids it.
- **A PauseAI letter:** its greeting and personal paragraph as
  `merge_values`, so `letterFor` rebuilds it. A letter that doesn't fit
  its template keeps its whole text in a new `own_text`. Attachments aren't
  kept.
- **A form letter:** its text in `letter`, from Airtable's Message, and
  the form version live then in `draft`, with its names filled in. So
  `own_words` and `LetterChanges` work as they do for letters through the
  letters inbox. `letters_from_supporters`' constraints change to allow
  these without a proxy.
- **A Postmark letter:** its text in `letter`, from its Bcc'd copy.
- **A letter's sent email:** an `email_sends` row with its Message-ID,
  Gmail thread and account, so the site's regular read joins later replies
  and bounces to it, as it does for a mailing's. `letterAnswered` is
  extended to cover form letters.
- **A reply from a person:** whole, in Blobs and `letter_replies`.
- **An automatic reply:** an `auto_reply` letter event, as now.
- **Everything else:** a one-off email (below).

### Joining replies

In this order, and only if one letter fits:

1. the same Gmail thread, or a Message-ID the letter's sent email has;
2. the politician, plus the letter's subject;
3. for an automatic reply, the politician and the time, within 3 days,
   with no other letter to them within 20 minutes;
4. for a form letter, the sender's address or name in the text;
5. when stuck, the quoted original: its Sent time, From, To and Cc.

Anything else is a one-off email. Where several of a politician's letters
fit rule 2, it joins the latest before it. The addresses used include past
ones, from the audit log.

### Letters whose text we can't read

The 910 August 2025 DeepMind letters seem to have gone from Joseph's personal
Gmail: 10 of the 20 replies that quote one name it as the sender. So they
keep no text of their own. Their template is rebuilt from those quotes, of
which 9 are "join 40" and 2 "join 50". A letter's page shows it labelled as
approximate, and never as what that person received, saying it was probably one
of them if it can't be told which. Replies join by rules 2 and 3 above.

### The import job

One job on `/staff/import-data`, "Import old letters", run every 5 minutes
as Luma's is, and when pressed. It's safe to run as often as needed, as it
skips what's kept.

- **Each run** reads for 20 seconds and shows on the job's page what it did
  and how much is left. It stops early the moment Gmail refuses.
- **Its pace** is at most 2 requests a second, so 40 in a run. It uses the
  site's stored tokens for joseph@ and policy@.
- **In all:** about 10,000 messages, so one or two days.
- **What it reads:** Joseph's Sent mail to politicians; what he received
  from their addresses and domains; the group's mail, by
  `list:policy@pauseai.uk OR list:policy-archive@pauseai.uk`; and policy@'s
  own mail, for the Bcc'd letters since 29 October 2026.

Its order: make the new mailings, then copy the form letters' text, then
read each sent email and join it, then read the replies, then keep the
one-off emails. A last step sets `replied_at` on letters with a person's
reply.

### One-off emails

These are threads with a politician that aren't a legacy letter or a
mailing's: Joseph's own emails, a volunteer copying policy@, an MP writing
to us. The import keeps those in Joseph's mailbox and the group's archive.

- **What counts:** a thread is kept whole if a message in it has an address
  a politician has or has had, one on a politician's own domain, or one on
  `parliament.uk`, `parliament.scot`, `senedd.wales`, `senedd.cymru` or
  `niassembly.gov.uk`, including its subdomains.
- **Politicians' own domains:** an office may write from a domain such as
  `tulipsiddiq.com`, which also says whose thread it is. The nightly check
  (`mp-check.ts`), which already looks up each MP's contact details in
  Parliament's Members API, saves the website and email domains it finds there.
  A domain counts only if it belongs to one politician, and social media and
  party sites are skipped. In a sample of 66 MPs, 38 listed a website. Peers
  mostly don't: 0 of 20 had a website, and 2 a non-parliament email. Other
  parliaments' domains come with their syncs (`plans/politician-editing.md`).
- **Reading quotes:** the forwarded or quoted From, Sent, To and Cc are used
  anywhere a message is already being read, to join it to a letter or file its
  thread under the politician named. As volunteers often forward their emails
  to us, policy@ and the group's archive, which are shared mail, are searched
  this way for threads with a politician. Of the 45 threads in the group's
  archive with no politician in their headers, 8 have a known politician's
  address, and 13 name one this way. Joseph's other mail isn't searched: it's
  found by its headers alone, to keep the rest of it private, and only then
  are its quotes read.
- **Mail that matches nothing, in policy@ and the group's archive:** isn't
  kept; the site keeps only its Gmail ID, so it reports it once. New mail is
  listed by sender and subject in an email to `NOTIFICATION_INBOX`, at most once
  a day, leaving out what the site recognises: its own forwards and sign-in
  codes, bounces, spam and Gmail's own mail. What the import finds is listed on
  its results page instead. If a kind matters, such as DSIT's, the rule is
  widened and the import run again.
- **Stored:** whole in Blobs, with a row in a new `one_off_messages`: its
  account, Gmail IDs, Message-ID, sender, recipients, subject and time, and
  the politician and supporter if its addresses match them, with no link to
  a mailing or campaign, as mail sent in bulk has its own. Kept once by
  Message-ID, and threaded across the two mailboxes by In-Reply-To and
  References, as each has its own Gmail thread IDs.
- **New threads:** a new `keep_politician_threads` on `staff_accounts` is on
  for policy@ and joseph@, and off for the others. While it's on, the
  site's regular read keeps that account's threads by the same rule. Joseph
  turns his own off on `/staff/me` when he chooses, which stops new ones
  being kept and leaves those already kept.
- **Who sees what:** a thread is "PauseAI" if every sender in it is a
  politician or one of PauseAI's accounts, and "Someone else" if anyone else
  appears. PauseAI's accounts are the connected Gmails, plus a hand-kept list
  of aliases, starting with joseph@pauseai.info and info@pauseai.info. It
  doesn't try to tell a volunteer from a constituent. Staff without the
  `supporters` permission see the name and text of "PauseAI" threads only.

### Staff pages

- **A letter's page** shows its text and thread for all of these. For a
  form letter, that's the diff from its form version.
- **The mailings list** shows the new mailings. A new row at its foot links
  to the one-off emails, at `/staff/mailings/one-off`, with a page for each
  thread at `/staff/mailings/one-off/[id]`. The list is like a mailing's page,
  read-only, with a filter for "PauseAI" or "Someone else". Its name is a
  placeholder for a person to confirm.
- **The politician's and supporter's pages** list their one-off emails.

### Campaigns, asks and sent emails

Designs: https://claude.ai/artifact/HWt1FMSz1XhgjWHvnkFHek

A campaign is like a mailing, from supporters rather than PauseAI. An ask is
what either one puts to politicians. So they get these pages:

- **Campaigns**, under Supporters, in place of Letters to MPs and with the same
  `supporters` permission, at `/staff/campaigns`. It's built like the mailings
  list: month and year sections, placed by each campaign's most recent letter,
  with the same counts box. There's no button to make one for now.
- **A campaign's page** has the shape of a mailing's: its header and counts, how
  many answered its ask, "The letter" with each version of its text and how much
  people changed it, and "Letters", as "Recipients" is on a mailing's.
- **Letters to MPs goes.** `/staff/letters` redirects to `/staff/campaigns`, and
  a letter's page stays at `/staff/letters/[id]`, with Campaigns marked in the
  menu (`under`). Its table, search, filters and download move to a campaign's
  Letters list. A person's or MP's letters are on their own page.
- **Mailings and campaigns name their ask** as "Ask to sign" or "Ask to attend",
  then its title, in place of "Ask", on their lists and their own pages. This
  changes the mailings pages too.
- **The top of a mailing's or campaign's page says who it's from and to.** A
  mailing's From is the address it went from, such as joseph@pauseai.uk, in place
  of "From Airtable", as is its row on the list. A campaign's From is how many
  supporters, and its row says "From supporters". To is how many politicians.
- **Asks** stay under Politicians, as a table of questions, with how many were
  written to, how many answered, and how they were asked. Each says what
  they were asked to do, in the form's words: "Sign a letter" or "Attend an
  event".
- **An ask's page** is `/staff/asks/[slug]`, in a mailing page's shape, with
  a line over its title in a politician's page's words, such as "PauseAI asked
  them to attend", then "How we asked", listing its campaigns and mailings by
  date, and "Answers". It has no letters of its own. Its form moves to `/staff/asks/[slug]/edit`. A campaign or
  mailing with no ask shows that, and needs nothing new.
- **Sent emails**, under Admin with only the `admin` permission, as the audit
  log is, at `/staff/sent-emails`, lists everything in `email_sends`, newest
  first, with no visible heading, as the menu names it, and just a search and
  filters over the table. Its columns are when, what, to, from (the address, with
  Gmail or Postmark under it), subject, outcome, and links to its letter and,
  through that, its campaign or mailing. A mailing test has no letter, so no link.
  - **People:** in To and From, someone outside PauseAI shows as their name, linked
    to their page, over their address: through the row's letter where it has
    one, otherwise by matching the address to one politician or supporter. If
    several match, it shows the address alone. An admin without `supporters` sees
    a supporter's name with no link. Staff and PauseAI's addresses stay plain.
  - **New columns:** `email_sends` gets a subject and a `from_address`, saved when
    sending. Older rows take theirs from their letter or mailing where that's
    exact, and imported letters from the sent email. Older sign-ins, alerts and
    forwards stay blank.
  - **Bounces** come from `email_problems`.
  - **Imported letters** are shown tagged "Imported", as Joseph sent them rather
    than the site, so the list goes back to June 2025. The rows keep their real
    dates, so they don't count against `GMAIL_DAILY_LIMIT`. Letters with no sent
    email, such as the 910 from August 2025, have no row.
  - A row doesn't show the email's text.

### A "new" tag on navigation links

A link in the staff navigation shows a "new" tag for 3 days after that person
first sees it, for any page added from now on, with nothing to do but add the
page to `STAFF_SECTIONS` (`lib/staff-sections.ts`).

- **Stored:** a new `staff_nav_seen` has a row for each account and page ID,
  with when they first saw it. The signed-in layout, which already loads the
  account for the navigation, adds rows for the pages that person can see and
  has no row for, then passes `StaffNav` those first seen in the last 3 days.
- **A new account** has no rows, so its pages are all marked as long since seen,
  and nothing shows as new on their first login.
- **This release:** the migration adds rows for every account and page that
  exists now, so only Campaigns and Sent emails show as new. Campaigns gets its
  own page ID, not `letters`.
- **Gaining a permission:** the pages it opens show as new, as they are to them.
- **When it goes:** the layout is kept between pages, so the tag goes at the next
  full page load after the 3 days.
- **Folded menu:** the rail of icons shows a dot instead of the word.

### Testing

1. **Against the real data, before the PR:** run the job's code from a
   local script with the read-only keys in `tmp/env`, against a local
   Postgres restored from production, writing only there. Compare its
   counts with the tables above. Real data stays in `tmp/`.
2. **In the PR:** fixture tests for each rule, using made-up people and
   text; a storyboard flow for the job, a legacy letter's page, the one-off
   emails, the account's switch, campaigns, asks, sent emails and the "new"
   tag; a gallery example for each new component; and the CI gate.
3. **After merging:** real runs. Check the site's Gmail
   reads stay clean in the import log.

### Data protection

These change before the job is built: `docs/data-protection.md`, the
privacy policy and erasure.

- **Form letters' text is now kept**, in the database, where
  `web-form-import.ts` keeps only who, whom, when and the subject. This
  covers Postmark letters too, from their Bcc'd copies.
- **Replies to old letters are kept**, in Blobs and backups.
- **The send log:** a letter's row stays after erasure, as a record that a letter
  went to that MP. Its new `from_address`, which can contain the supporter's
  name, and `subject`, which they may have written, are blanked by erasure
  (`lib/server/erasure.ts`) before their letters are deleted.
- **A new row for one-off emails:** volunteers' emails with politicians, and
  others in Joseph's mailbox and policy@. Lawful basis as letters to MPs, with
  Article 9(2)(d) for political opinion. Kept until erased. A supporter's
  erasure deletes their rows and blobs.
- **Joseph's mailbox:** say that the job reads it, and that the site keeps
  reading it until he turns it off, keeping only threads with politicians and
  the group's mail. Say the same of his personal Gmail if it's used.
- **The privacy policy** says that copying us into an email to your MP means
  we keep it (copy for a person to write).

## Phase 2: improve the one-off emails

Phase 1 keeps and shows them. None of this is needed for that.

- **Past and personal addresses:** a new `politician_addresses` table holds
  them, in place of reading the audit log, and lets one person have several,
  such as an office address.
- **Quoted originals:** where a politician's message is only quoted, a thread's
  page shows it, marked "quoted, not received", from the quoted text of the
  messages it loads. It's worked out each time, so nothing new is stored, and
  it stops showing if the real one is kept.
- **Casework:** a caseworker's address seen with an MP's in a thread is
  recorded as theirs, so later threads link to that MP.

## Clean up at the end

- **Joseph's personal Gmail:** if he can provide the August 2025 letters, for
  instance as an export, as the site's Google client can't sign in an account
  outside the Workspace, the import fills in their text.
- **When to stop reading joseph@:** he turns it off when he chooses.
- **After the import has run:** revoke the read-only Google client at
  https://myaccount.google.com/permissions on both accounts, delete it in Google
  Cloud, and delete `tmp/prod-gmail/`, which holds real mail, and its keys in
  `tmp/env`.

## Separately: the letter itself, and whether it gets answered

- **Watch for replies** to letters through the letters inbox, which went
  live on 3 November 2026. If none come after about 30 letters, ask a
  friendly MP's office whether Mimecast, Parliament's mail filter, holds
  them, and ask DearMP's team what gets through. There were 6 letters by 4
  November, with 5 messages back that haven't been looked at yet.
- **Changes worth making:** plain text with links to the campaign's
  documents instead of attached PDFs; the form gives points for the person
  to put in their own words; and a subject saying it's from a constituent.
