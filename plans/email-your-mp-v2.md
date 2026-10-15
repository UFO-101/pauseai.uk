# Email your MP, version 2

Draft plan, 12 Oct 2026. UK only for now. No deadline; the stages roll out in the order the code needs. Success, for now, is measured in letters sent. MP replies and signatures matter more in the end, but they're a separate project.

## Today

https://pauseai.info/uk-email-mp, embedded on pauseai.uk/campaigns, has one hardcoded letter. It looks up the MP from a hand-exported list, and hides the form if they've already signed or responded. Letters go into Airtable, and an Airtable automation sends them from `policy@pauseai.uk` at 8am the next day, with the PDFs attached. Nobody checks that the sender owns their email address. The old code is in https://github.com/PauseAI/pauseai-website: `src/routes/uk-email-mp`, `src/routes/api/uk-send-mp-email`, `src/lib/components/UKMPEmailForm.svelte`.

## Version 2

Built entirely in pauseai.uk. When it works, the old tool is deleted from pauseai-website, and there's no iframe any more.

- **Campaigns, defined in code**: title, subject, letter, attachments, and the rule for "done". Each campaign has a page, `/campaigns/<slug>`: `regulate-letter-pm` and `support-sobel-bill` for now, in that priority order. Plain `/campaigns` redirects to the first. If the MP has already done a campaign, its page moves on to the page of the first one they haven't, with the name and postcode filled in, and a note at the top saying why ("your MP has already signed the letter, so here's this one"). Going straight to a campaign's link shows it without the note.
- **Always one to write**: the last campaign, the Sobel bill, has no "done" status, as everyone is asked to go to its debate and there's no data on who supports it yet. So every MP has a campaign to write to them about.
- **Postal address**: collected from the sender and put in the letter's signature.
- **Attachments**: the PDFs stay real attachments. There's one copy of each, in pauseai.uk's `public/pdfs/`. Postmark allows 10MB per message after Base64 encoding; today's two PDFs total about 270KB.
- **Sent straight away**: there's no email confirmation, for now. Joseph's idea for later: when a letter bounces, an LLM could spot a mistyped sender address.
- **Formatting**: senders can use bold, italic and bullet lists, in a standard WYSIWYG editor kept that simple. Finding the MP opens a page of its own for writing the letter (added 15 Oct 2026). The form goes on to a preview page with the whole letter as it will be sent, address and all, where Turnstile and the send button are (added 15 Oct 2026, like WriteToThem). After sending, a page of its own thanks them, and shows the home page's "Upcoming events" with up to three in-person events within 50km of their postcode, then online ones to make four. Luma's official API (`LUMA_API_KEY`, as the trackers use) gives events' coordinates, and postcodes.io the postcode's. The old tool's letters were Markdown, and its Airtable automation's message box takes Markdown, which Airtable's docs say is applied to the whole message (https://support.airtable.com/articles/1091012569-airtable-automation-action-send-email). So MPs most likely already got formatted letters; a sent letter in `policy@`'s Sent folder would confirm it. Letters go out with an HTML part and a plain-text part, and the server cleans the HTML down to those tags.
- **Test MPs**: postcode ZZ99ZZ finds "Testy McTestface MP", whose email goes to `test@pauseai.uk`. ZZ99ZS finds a second, who has already signed the letter to the PM, to try the move to the next campaign. Outside production, the form lists both postcodes. Everything works as for a real MP, including tracking, so it tests the lot.

## Sending

- **Through Postmark**, because it allows sending to people who haven't subscribed, which letters to MPs need. New accounts have to pass Postmark's approval before they can send to outside addresses. Letters are one-to-one and triggered by the sender, so they go on the transactional stream. Francis signs up and pays for Basic, $15 a month for 10,000 emails. Letters go out from their own subdomain, `letters.pauseai.uk`, which can later carry letters to MSPs, the PM and others. The site's other email, such as forwarded replies and login confirmations, goes from `notify.pauseai.uk`. Each has SPF, DKIM, DMARC and a custom Return-Path, which keeps their sending reputations separate.
- **Addresses**: each letter gets its own address, `reply+<hash>@letters.pauseai.uk`, where the hash identifies the letter.
  - From: "Jane Smith via PauseAI" `<reply+<hash>@letters.pauseai.uk>`.
  - Reply-To: `jane@example.com, reply+<hash>@letters.pauseai.uk`. Most mail clients reply to both, so Jane gets the reply directly and we get a copy.
- **Replies**: Postmark receives mail for the subdomain (an MX record pointing to `inbound.postmarkapp.com`) and posts the whole message to a webhook. That includes the text, the To and Cc lists, and the part after `reply+` as `MailboxHash`, so we don't need to fetch anything. We forward the reply to `policy@pauseai.uk`, and to Jane if her address isn't in its To or Cc (the office replied only to From). Each reply is logged against its letter: when it came and who from, but not its text. Automatic replies (an office's acknowledgement, out-of-office), known by their headers or subject, are logged as such and don't count as replies. Staff see it with the letter, at `/staff/letters`. A reply that doesn't reach us, such as a letter by post, isn't recorded. Before relying on this, test a reply from Outlook, which Parliament uses. The form tells senders that a copy of any reply comes to PauseAI UK.
- **Bounces and spam complaints** don't go to the From address. Postmark handles them and reports them to a webhook on pauseai.uk, with its `MessageID`.
- **Webhook security**: Postmark doesn't sign webhooks. Each webhook URL carries a secret username and password (basic auth) over HTTPS, and our routes reject requests without them.
- **Records**: each letter is kept in our own database. CiviCRM has no API for logging them there.
- **No tracking**: Postmark's open and link tracking stay off for letters. A tracking pixel or rewritten links in a constituent's letter would look bad, and the old tool, sending through Gmail, had neither.
- **Spam**:
  - Turnstile and the honeypot field, as today.
  - Recipients must be on the MP list.
  - One letter per sender email per campaign. Letters to the test MPs don't count.
- **Google Ads**: when the letter is sent, the form pushes `{ event: "mp_email_sent" }` to `dataLayer`. GTM's existing trigger fires the conversion, so nothing changes in GTM or Ads.

## MPs and signatories

- **MPs**: Airtable's "UK Parliamentarians" table is the source of truth for who the MPs are and their emails, kept up to date by the policy team. It's copied nightly, read only: rows whose Body is "House of Commons", except those ticked "No longer in office". The sync also adds the test MPs. A sync that changes many MPs at once is held for a person to check.
- **Checked against Parliament**: the sync also compares Airtable with Parliament's Members API (https://members-api.parliament.uk/, no key needed), and a staff page lists where they disagree: constituencies missing from either, different names, and emails Parliament doesn't list. Nothing is changed automatically. Checked 14 Oct 2026, all 650 constituencies match, with one real name difference and 6 email differences. Parliament lists no email for 3 MPs that Airtable has one for. Postcodes are matched to MPs by the official constituency code that postcodes.io gives, through the ONS's list of the 650 names and codes, since postcodes.io's names can differ from the official ones (it drops the circumflex in Montgomeryshire and Glyndŵr). The check also flags Airtable constituencies not spelt as that list has them.
- **Status per campaign** (signed, date, note) lives in our database, edited in the staff interface, not in Airtable. Only campaigns an MP can have done have one: the Sobel bill has none, and isn't in the staff interface. The public signatories list on `/campaigns` reads from it too.
- **Other signers**: MSPs, MSs, MLAs and peers who signed are added by hand.
- **Import**: a one-off import copies everyone with a status from Airtable. Then the Airtable iframe fallback, and `airtable.com` in `frame-src`, are deleted.

## Database

Netlify Database (Postgres). It holds:
- politicians and their status for each campaign
- letters: sender details, letter text, status and its history, and Postmark's `MessageID`
- staff sessions, and a log of who changed what

The one-letter-per-campaign check is a count over the letters table.

- **Migrations**: plain SQL in `netlify/database/migrations/<number>_<slug>.sql`. Netlify applies them before each production publish, and to each preview's copy of the database. They're never applied by hand.
  - They must be backward compatible (expand, then contract), since the old code is still live while they run.
  - They must work with or without a transaction around each file, so no `CREATE INDEX CONCURRENTLY`.
- **Queries**: no ORM. Only `lib/server/db.ts` connects, using `NETLIFY_DB_URL`. A lint rule and a CI check enforce that.
- **Tests and local development**: use the devcontainer's Postgres. A helper makes a fresh database and applies the migrations in order with `psql`. CI gets a Postgres service.
- **Previews** get a copy of production data, including senders' details. That's accepted for now. Outside production, letters can only go to the test MP. The sending code enforces this, and a test checks it.
- **Backups**: Netlify takes them automatically. Before stage 3 goes live, check how often they run, how long they're kept, and try a restore.
- **Keeping data**: sent letters are kept indefinitely for now.

## Staff interface

For the policy team to edit campaign status, add signers from outside the Commons, set the test MP's status, and see letters and bounces.

- **Where**: under `app/(staff)/staff/`, so the URLs are `/staff/...`, with staff API routes at `/staff/api/...`. Its layout leaves out `<Nav>` and turns analytics off with `<NoAnalytics />`, as `app/(tools)/layout.tsx` does. It stays under the root layout (`app/layout.tsx`), so the footer and consent banner still show. A separate root layout would mean splitting the site's root layout across every route group. Nothing links to it, it's not in the sitemap or `robots.txt`, and it sends `noindex`.
- **Login**: by email, for any pauseai.uk address (changed from Google on 14 Oct 2026).
  - The login page asks only for an email address, and says the same whatever is typed. A pauseai.uk address is emailed a link.
  - The link works once, for 15 minutes. At most 5 are sent an hour to one address.
  - The link only works in the browser that asked for it, which holds a cookie for 15 minutes (changed from a confirm button on 15 Oct 2026). A mail scanner that follows the link, or another device, logs nobody in and doesn't use it up. The login page and the email say so.
  - The link's address is fixed at build time from Netlify's settings, never taken from the request.
  - Sessions are kept in the database. The cookie is `HttpOnly`, `Secure`, `SameSite=Lax`, works only under `/staff`, and lasts 12 hours.
- **Every route requires login.** Next.js 16's guide (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`) says a check in the layout isn't enough. So:
  - `proxy.ts` sends anyone on `/staff/:path*` without a session cookie to login.
  - Every staff page, Server Action and route handler first calls `requireStaff()` (`lib/server/staff-auth.ts`), which checks the session in the database.
  - A CI check fails if a file under `app/(staff)/` doesn't call `requireStaff()`.
- **Previews**: staff can log in on previews too.

## Rollout

Version 2 is built at `https://pauseai.uk/campaigns-v2` (and `/campaigns-v2/<slug>`), which isn't linked from anywhere, isn't in the sitemap, and sends `noindex`. There's no separate Email your MP page: `/campaigns-v2` is what becomes `/campaigns`. The old tool keeps running meanwhile. Each stage goes live on that URL when it's ready.

1. **Campaigns**: per-campaign links, the fallback, "already done" wording, attachments and the test MP. Francis writes the copy for each campaign, including the bill's exact name and the "already done" wording, and Joseph approves it. Until then the code uses placeholders (see `AGENTS.md`). Letters still go into Airtable, which needs `AIRTABLE_WRITE_API_KEY` on pauseai.uk.
2. **MPs**, first from Parliament's API, then (after talking to Joseph on 14 Oct) from Airtable, checked against Parliament's API.
3. **Database, staff login and staff interface.** Status and signatories move off Airtable.
4. **Direct sending**: postal address, Postmark, the bounce and reply webhooks, one letter per campaign, and the formatting editor. Then the Airtable 8am automation is switched off.
5. **The swap**, a while off: not before Postmark has approved the account, the words marked with the asterism are approved and `placeholder-copy.test.ts` is turned back on (it's skipped for now, so the branch can build and deploy previews), a test letter has been replied to from Outlook, the privacy policy covers Email your MP, and production has real Turnstile keys. Without them the check is skipped, leaving only the honeypot between bots and MPs' inboxes.
   - `/campaigns-v2` replaces `/campaigns`: `CAMPAIGNS_PATH` in `lib/email-your-mp.ts` becomes `/campaigns`, the folder moves, and today's `/campaigns` page and its iframe go. The campaign pages already have its sections; the signatories, QR code and styles they borrow from `app/(site)/campaigns/` stay, and the iframe code in `CampaignsClient` goes.
   - `/campaigns-v2` URLs redirect to their `/campaigns` ones.
   - pauseai.info's `uk-email-mp` URLs redirect to pauseai.uk.
   - The old tool is deleted from pauseai-website (Francis does this). The only other link to it there is the button on `dear-sir-demis-2025`, which the redirect covers.

## Testing

Be sure to add appropriate behaviour tests of flows, and new visual test pages.

**Pages and flows** (Playwright, with `DATA_FIXTURES=1`):
- **The full ZZ99ZZ flow**: postcode, form, sent.
- **Ads event**: one `mp_email_sent` per accepted form, and none on an error.
- **Campaign URLs**: each campaign URL and an unknown slug are in `tests/routes.ts`.
- **Staff routes locked**: every `/staff` route, without a session, redirects to login or returns 401, and Server Actions change nothing.
- **Staff screens**: tested by logging in with the emailed link, taken from the outbox. There's no login bypass.
- **Before and after the swap**: before, the v2 URL is `noindex` and unlinked. After, it redirects, and `/campaigns` has no iframe. pauseai.info stays in `frame-src` for the onboarding form.
- **Visual tests** of the new and changed pages. Their baselines only settle after the swap.

**Email.** These follow the usual `outsideFetch` and fixtures pattern, with these less obvious parts. Add them to `docs/testing.md` when the code lands.
- **No Postmark library.** Call Postmark's HTTP API through `outsideFetch`, from `lib/server/postmark.ts` only. The `postmark` npm package makes its own HTTP requests, which would bypass the fixtures in Playwright builds.
- **Vitest checks what we sent.** The Postmark fixture just returns a `MessageID`. Tests read the request MSW received and check From, Reply-To, the text and the attachments.
- **Playwright reads an outbox.** With `DATA_FIXTURES=1`, `outsideFetch` also writes each outgoing email to an outbox file in a temporary folder. The flow test checks the newest letter there. This is test-only plumbing, with no production route or table.
- **Webhooks are posted directly.** Tests post bounce, spam complaint and inbound payloads, in Postmark's format, straight to our routes with test basic auth credentials. Wrong or missing credentials must be rejected. The inbound test checks the reply is forwarded and not stored.
- **No Mailpit or other mail catcher.** We send through Postmark's API, not SMTP, so a mail catcher would test a different path from production.
- **Checking real sending by hand.** On previews and the live site, use the test MP. Postmark's test token `POSTMARK_API_TEST` accepts messages without delivering them. Its addresses at `bounce-testing.postmarkapp.com`, such as `hardbounce@` and `softbounce@`, produce real bounce webhooks. Neither is used in CI.

## Later

- **Follow-up questionnaire**: if no reply has reached us after 14 days, email the sender to ask whether the MP replied (it may have been by post).

## Open questions

### Tasks for Francis

- Before stage 3 goes live, check Netlify's database backups and try a restore.

**Switching over:**
- At the swap, add the redirects in pauseai-website and delete the old tool.
