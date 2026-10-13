# Email your MP, version 2

Draft plan, 12 Oct 2026. UK only for now. No deadline; the stages roll out in the order the code needs. Success, for now, is measured in letters sent. MP replies and signatures matter more in the end, but they're a separate project.

## Today

https://pauseai.info/uk-email-mp, embedded on pauseai.uk/campaigns, has one hardcoded letter. It looks up the MP from a hand-exported list, and hides the form if they've already signed or responded. Letters go into Airtable, and an Airtable automation sends them from `policy@pauseai.uk` at 8am the next day, with the PDFs attached. Nobody checks that the sender owns their email address. The old code is in https://github.com/PauseAI/pauseai-website: `src/routes/uk-email-mp`, `src/routes/api/uk-send-mp-email`, `src/lib/components/UKMPEmailForm.svelte`.

## Version 2

Built entirely in pauseai.uk. When it works, the old tool is deleted from pauseai-website, and there's no iframe any more.

- **Campaigns, defined in code**: title, subject, letter, attachments, and the rule for "done". `/email-your-mp/<slug>` opens a campaign. Plain `/email-your-mp` picks the first campaign, in priority order, that this MP hasn't done. The order for now: sign the letter to the PM, then support Alex Sobel's bill.
- **Already done**: if the MP has already done the campaign, the page says so ("your MP has already signed") and the letter thanks them. The form isn't hidden.
- **Postal address**: collected from the sender and put in the letter's signature.
- **Attachments**: the PDFs stay real attachments. There's one copy of each, in pauseai.uk's `public/pdfs/`. Postmark allows 10MB per message after Base64 encoding; today's two PDFs total about 270KB.
- **Email confirmation**: after the form is submitted, we email the sender a link with a single-use token. Clicking it sends the letter straight away.
- **Test MP**: postcode ZZ99ZZ finds "Testy McTestface MP", whose email goes to a test inbox. Everything works as for a real MP, including tracking, so it tests the lot.

## Sending

- **Through Postmark**, because it allows sending to people who haven't subscribed, which letters to MPs need. New accounts have to pass Postmark's approval before they can send to outside addresses. Letters are one-to-one and triggered by the sender, so they go on the transactional stream. We'll pay: Basic is $15 a month for 10,000 emails. Letters go out from their own subdomain (e.g. `mp.pauseai.uk`) with SPF, DKIM, DMARC and a custom Return-Path, which keeps their sending reputation separate.
- **Addresses**: each letter gets its own address, `reply+<hash>@mp.pauseai.uk`, where the hash identifies the letter.
  - From: "Jane Smith via PauseAI" `<reply+<hash>@mp.pauseai.uk>`.
  - Reply-To: `jane@example.com, reply+<hash>@mp.pauseai.uk`. Most mail clients reply to both, so Jane gets the reply directly and we get a copy.
- **Replies**: Postmark receives mail for the subdomain (an MX record pointing to `inbound.postmarkapp.com`) and posts the whole message to a webhook. That includes the text, the To and Cc lists, and the part after `reply+` as `MailboxHash`, so we don't need to fetch anything. We forward the reply to a shared PauseAI inbox, and to Jane if her address isn't in its To or Cc (the office replied only to From). Nothing about the reply is stored. Before relying on this, test a reply from Outlook, which Parliament uses. The form tells senders that a copy of any reply comes to PauseAI UK.
- **Bounces and spam complaints** don't go to the From address. Postmark handles them and reports them to a webhook on pauseai.uk, with its `MessageID`.
- **Webhook security**: Postmark doesn't sign webhooks. Each webhook URL carries a secret username and password (basic auth) over HTTPS, and our routes reject requests without them.
- **CiviCRM**: each send is logged there as an activity.
- **Spam**:
  - Turnstile and the honeypot field, as today.
  - Recipients must be on the MP list.
  - At most 5 confirmation emails a day to any one address, so the form can't be used to flood someone's inbox.
- **Google Ads**: when the server accepts the form, the form pushes `{ event: "mp_email_sent" }` to `dataLayer`. GTM's existing trigger fires the conversion, so nothing changes in GTM or Ads. This slightly overcounts, since some people never confirm.

## MPs and signatories

- **MPs**: copied nightly from Parliament's Members API (https://members-api.parliament.uk/, no key needed). The sync also adds the test MP. A sync that changes many MPs at once is held for a person to check.
- **Emails**: the sync prefers the parliamentary office address, and trims spaces, since some addresses in the API end in one.
- **No email**: 3 MPs have no email in the API (New Forest East, West Tyrone, Holborn and St Pancras), so the page shows "no email listed" for them.
- **Salutations**: 457 MPs have none in the API, so we build one from the name.
- **Status per campaign** (signed or supports, date, note) lives in our database, edited in the staff interface. The public signatories list on `/campaigns` reads from it too.
- **Other signers**: MSPs, MSs, MLAs and peers who signed are added by hand. Parliament's API covers only the Commons and the Lords.
- **Import**: a one-off import copies everyone with a status from Airtable. Then `lib/server/airtable.ts`, its CI check, the Airtable iframe fallback, and `airtable.com` in `frame-src` are deleted.

The old list is out of date (checked 13 Oct 2026: 636 of 650 match), which the sync fixes.

## Database

Netlify Database (Postgres). It holds:
- politicians and their status for each campaign
- letters: sender details, letter text, a hash of the confirmation token, status and its history, and Postmark's `MessageID`
- staff sessions, and a log of who changed what

The cap on confirmation emails is a count over the letters table.

- **Migrations**: plain SQL in `netlify/database/migrations/<number>_<slug>.sql`. Netlify applies them before each production publish, and to each preview's copy of the database. They're never applied by hand.
  - They must be backward compatible (expand, then contract), since the old code is still live while they run.
  - They must work with or without a transaction around each file, so no `CREATE INDEX CONCURRENTLY`.
- **Queries**: no ORM. Only `lib/server/db.ts` connects, using `NETLIFY_DB_URL`. A lint rule and a CI check enforce that.
- **Tests and local development**: use the devcontainer's Postgres. A helper makes a fresh database and applies the migrations in order with `psql`. CI gets a Postgres service.
- **Previews** get a copy of production data, including senders' details. That's accepted for now. Outside production, letters can only go to the test MP. The sending code enforces this, and a test checks it.
- **Backups**: Netlify takes them automatically. Before stage 3 goes live, check how often they run, how long they're kept, and try a restore.
- **Keeping data**: sent letters are kept indefinitely for now. Unconfirmed letters are deleted after 7 days, by a Netlify scheduled function.

## Staff interface

For the policy team to edit campaign status, add signers from outside the Commons, set the test MP's status, and see letters and bounces.

- **Where**: under `app/(staff)/staff/`, so the URLs are `/staff/...`, with staff API routes at `/staff/api/...`. It has its own root layout, without the site's header, analytics or consent banner. Nothing links to it, it's not in the sitemap or `robots.txt`, and it sends `noindex`.
- **Login**: Google, pauseai.uk Workspace accounts only.
  - The OAuth client is set to "Internal", so Google refuses outside accounts. Joseph sets it up in the pauseai.uk Workspace's Google Cloud project, and is the first staff user.
  - The server checks the token's signature, `email_verified`, and that `hd` is exactly `pauseai.uk`.
  - Sessions are kept in the database. The cookie is `HttpOnly`, `Secure`, `SameSite=Lax`, works only under `/staff`, and lasts 12 hours.
  - The library is Arctic with our own session table, or Better Auth.
  - Login starts from a link, because the site's `form-action 'self'` would block a form that redirects to Google.
- **Every route requires login.** Next.js 16's guide (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`) says a check in the layout isn't enough. So:
  - `proxy.ts` sends anyone on `/staff/:path*` without a session cookie to login.
  - Every staff page, Server Action and route handler first calls `requireStaff()` (`lib/server/staff-auth.ts`), which checks the session in the database.
  - A CI check fails if a file under `app/(staff)/` doesn't call `requireStaff()`.
- **Previews**: Google won't accept wildcard return addresses, so staff login works on production and locally only. Local development needs its own OAuth client.

## Rollout

Version 2 is built at `https://pauseai.uk/email-your-mp-v2`, which isn't linked from anywhere, isn't in the sitemap, and sends `noindex`. The old tool keeps running meanwhile. Each stage goes live on that URL when it's ready.

1. **Campaigns**: per-campaign links, the fallback, "already done" wording, attachments and the test MP. Francis writes the copy for each campaign, including the bill's exact name and the "already done" wording, and Joseph approves it. Until then the code uses placeholders (see `AGENTS.md`). Letters still go into Airtable, which needs `AIRTABLE_WRITE_API_KEY` on pauseai.uk.
2. **MPs** from Parliament's API.
3. **Database, staff login and staff interface.** Status and signatories move off Airtable.
4. **Direct sending**: postal address, email confirmation, Postmark, the bounce and reply webhooks, and the confirmation cap. Then the Airtable 8am automation is switched off.
5. **The swap**:
   - `/email-your-mp-v2` moves to `/email-your-mp` and redirects there.
   - `/campaigns` shows the form itself instead of the iframe.
   - pauseai.info's `uk-email-mp` URLs redirect to pauseai.uk.
   - The old tool is deleted from pauseai-website (Francis does this). The only other link to it there is the button on `dear-sir-demis-2025`, which the redirect covers.

## Testing

Be sure to add appropriate behaviour tests of flows, and new visual test pages.

**Pages and flows** (Playwright, with `DATA_FIXTURES=1`):
- **The full ZZ99ZZ flow**: postcode, form, confirmation link, sent.
- **Ads event**: one `mp_email_sent` per accepted form, and none on an error.
- **Campaign URLs**: each campaign URL and an unknown slug are in `tests/routes.ts`.
- **Staff routes locked**: every `/staff` route, without a session, redirects to login or returns 401, and Server Actions change nothing.
- **Staff screens**: tested by logging in through the fixture Google flow. There's no login bypass.
- **Before and after the swap**: before, the v2 URL is `noindex` and unlinked. After, it redirects, and `/campaigns` has no iframe. pauseai.info stays in `frame-src` for the onboarding form.
- **Visual tests** of the new and changed pages. Their baselines only settle after the swap.

**Email.** These follow the usual `outsideFetch` and fixtures pattern, with these less obvious parts. Add them to `docs/testing.md` when the code lands.
- **No Postmark library.** Call Postmark's HTTP API through `outsideFetch`, from `lib/server/postmark.ts` only. The `postmark` npm package makes its own HTTP requests, which would bypass the fixtures in Playwright builds.
- **Vitest checks what we sent.** The Postmark fixture just returns a `MessageID`. Tests read the request MSW received and check From, Reply-To, the text, the attachments and the confirmation link.
- **Playwright reads an outbox.** With `DATA_FIXTURES=1`, `outsideFetch` also writes each outgoing email to an outbox file in a temporary folder. The flow test takes the confirmation link from the newest email there. This is test-only plumbing, with no production route or table.
- **Webhooks are posted directly.** Tests post bounce, spam complaint and inbound payloads, in Postmark's format, straight to our routes with test basic auth credentials. Wrong or missing credentials must be rejected. The inbound test checks the reply is forwarded and not stored.
- **No Mailpit or other mail catcher.** We send through Postmark's API, not SMTP, so a mail catcher would test a different path from production.
- **Checking real sending by hand.** On previews and the live site, use the test MP. Postmark's test token `POSTMARK_API_TEST` accepts messages without delivering them. Its addresses at `bounce-testing.postmarkapp.com`, such as `hardbounce@` and `softbounce@`, produce real bounce webhooks. Neither is used in CI.

## Later

- **Follow-up questionnaire**: if no reply has reached us after 14 days, email the sender to ask whether the MP replied (it may have been by post).

## Open questions

### To confirm with Joseph

1. **Postmark:** OK to pay for it (Basic, $15 a month for 10,000 emails)? Who sets up the account? Or should we keep sending through the Gmail API from `policy@pauseai.uk`, as now? Francis prefers Postmark: with Gmail, every letter's From is `policy@`, an address that doesn't reach the constituent, so a reply to From goes only to us.
2. **Signatories list:** OK to move it to the new database?
3. **Airtable:** can Francis have a token that can write to the email tool's table (stage 1 still sends letters through Airtable), and read the signatories for the migration?
4. **Airtable MP table:** what else uses it? The email tool has its own JSON file of MP emails. So we can just run that separately.
5. **Replies inbox:** which shared PauseAI inbox do replies get forwarded to?
6. **Test MP inbox:** can we make a shared address for it, or add Francis to the pauseai.uk Google Workspace?
7. **Email confirmation:** is he fine with senders having to click a link in their inbox before their letter is sent? It stops people sending in someone else's name, but some won't come back to click.
8. **Responded:** how do we want to record that an MP has responded? Version 2 doesn't track it: Airtable's "Responded Frontier AI Letter" ticks aren't carried over, and replies are only forwarded. Options: a tick per campaign set by hand in the staff interface, recording automatically when a reply reaches us, or the follow-up questionnaire.

### Also to check

9. **Postmark approval:** will Postmark approve the account for letters to MPs? We apply with a description of the tool: one constituent writing to their own MP, after confirming their email.

### Tasks for Francis

Things the code can't do. Claude writes the code.

**Words** (Joseph approves):
- Each campaign's letter, subject and "already done" wording, including the exact name of Alex Sobel's bill.
- The PDF attachments for the bill campaign.
- The form text, including the consent wording and the notice that a copy of any reply comes to PauseAI UK.
- The confirmation email, and the note sent with a forwarded reply.
- Changes to the pauseai.uk privacy policy: postal addresses, copies of replies going to PauseAI, and keeping letters indefinitely.

**Accounts and settings:**
- **Netlify:** turn on Netlify Database for the site. Set the environment variables (Postmark server token and webhook credentials, Google login client, Turnstile keys, CiviCRM key, Airtable write key).
- **Postmark:** create the account and a server, pay for Basic, add the `mp.pauseai.uk` domain and its inbound domain, and apply for approval.
- **DNS:** add Postmark's records for `mp.pauseai.uk`: DKIM, the Return-Path CNAME, DMARC, and an MX record pointing to `inbound.postmarkapp.com` for replies.
- **Turnstile:** a site key that works on pauseai.uk. The pauseai.info one may be limited to that domain.
- **CiviCRM:** an API key, and an activity type for logged letters.
- **Google:** Joseph creates the staff login client in the pauseai.uk Workspace's Google Cloud project.

**Checks:**
- Reply to a test letter from Outlook, and check the reply reaches both Jane and us.
- After the import, the policy team checks the signatories list, and marks MPs who support the bill.
- Before stage 3 goes live, check Netlify's database backups and try a restore.

**Switching over:**
- After stage 4, turn off the Airtable 8am automation.
- At the swap, add the redirects in pauseai-website and delete the old tool.
