# Letters to MPs through a double proxy

Supporters' letters go to MPs by the Gmail API from a Gmail account used
for nothing else, the letters inbox. Each side sees the other only as a
proxy, a plus address on that account:

- The MP gets the letter from
  `"Jane Smith (via PauseAI)" <letters+jane.smith@example.org>`.
- The supporter gets the MP's replies from
  `"Meg Hillier MP (via PauseAI)" <letters+meg.hillier.mp@example.org>`.

Mail to one proxy is sent on, unchanged, from the other. The MP's office
never sees the supporter's email address, and every message both ways is
kept. Mail in the letters inbox that the site can't account for is an
error.

Unchanged:

- PauseAI's mailings go from the Gmail a staff member chooses, policy@ by
  default. The letters inbox can't be chosen.
- Letters sent before this keep their `…@letters.pauseai.uk` addresses,
  Postmark's inbound and bounce webhooks, and `forwardReply`
  (`lib/server/postmark-webhooks.ts`).

The repo is public, so the letters inbox's real address appears nowhere
in it. `LETTERS_INBOX` holds it, set only in Netlify; fixtures, tests,
`.env.example` and these examples use `letters@example.org`. The code
builds every proxy from the variable (`<local>+<tag>@<domain>`), so no
address is written into it.

## What was tested

On 3 November 2026 a message was sent with `users.messages.send` from a
plus address on the letters inbox, named "Jane Smith (via PauseAI)", with
no "Send mail as" alias. port25's verifier
(check-auth@verifier.port25.com) and an email from Outlook.com showed:

- The From arrives as written, name and plus address both.
- SPF and DKIM pass, aligned with pauseai.uk (`d=pauseai.uk`, `s=google`).
- The envelope sender (Return-Path) is the inbox's plain address, so
  bounces and automatic replies sent there have no tag. They're matched
  by the Message-ID they quote.
- Mail to a plus address arrives with the tag in its To and Delivered-To.
- Gmail filed both incoming messages in Spam, as the account is new, so
  the site reads Spam too.

If Google stops this working, Workspace's SMTP relay can send from any
address in our domain (https://support.google.com/a/answer/2956491).

Still to check while building, each in a test against the fake and once
for real: that a Bcc in a message sent by the API is delivered and
stripped; that `history.list` reports messages Gmail filed in Spam; and
Gmail's size limit for a send, against an MP's letter with large PDFs.

## Where the code is now

- Sending a supporter's letter: `submitLetter` in
  `lib/server/mp-letters.ts`, by Postmark from the letter's own address.
  It deletes the letter if sending fails.
- Sending by Gmail: `send()` in `lib/server/email.ts`, with
  `{ backend: { name: "gmail", account } }`, as the `gmailEmail` channel
  in `lib/server/mailing-channels.ts` does. Gmail sends with its own
  Message-ID, which `send()` asks for afterwards
  (`email_sends.rfc_message_id`).
- Connected Gmail accounts: tokens on `staff_accounts`
  (`lib/server/gmail-accounts.ts`), connected on `/staff/me` by the staff
  member logged in as that address, with the scopes in
  `lib/server/outside-services/gmail.ts`. `GMAIL_DAILY_LIMIT` and
  `sentToday` count the past 24 hours' sends.
- Reading: `readGmail` in `lib/server/gmail-reading.ts`, hourly from
  `netlify/functions/read-gmail`, keeps messages in a letter's thread
  whole in Netlify Blobs (`lib/server/outside-services/blobs.ts`) with a
  row in `letter_replies`, and records bounces (`recordBounce`).
- Bounces and blocks: `handleDeliveryProblem` and its `HOOKS` by purpose
  in `lib/server/delivery-problems.ts`; `recordProblem` and `unblock` in
  `lib/server/email.ts`; `unblockAddress` in
  `app/(staff)/staff/actions.ts`. An MP's address changes in the nightly
  sync (`lib/server/politician-sync.ts`).
- A letter's history is `letter_events`; its page shows
  `LetterHistory.tsx` and the thread from `lib/server/letter-threads.ts`.
- Automatic mail is recognised by `isMachineReply`
  (`lib/server/postmark-webhooks.ts`).
- The campaigns' letters are in `lib/content/email-your-mp.ts`; the form
  starts from `draftLetter` (`lib/email-your-mp.ts`).
- Schedules: `netlify/functions/*/` with a test each; `SENDING` in
  `lib/staff-time.ts`.

## 1. Data protection, first

`docs/data-protection.md`, the privacy policy and erasure change before
anything else is built (`plans/README.md`). The privacy policy's words
are a person's to write; leave placeholder copy.

- Letters, the supporter's answers and the MP's replies are kept whole,
  in Blobs and `letter_replies`, and backed up.
- Proxies hold a supporter's name and email address.
- Each letter keeps its starting draft (step 7), which has the
  supporter's name and address.
- The MP no longer gets the supporter's email address.
- Erasing a supporter deletes their proxies, drafts, kept messages and
  blobs, and moves their messages in the letters inbox to Trash
  (`messages.trash`), which Gmail empties after 30 days. Deleting at once
  would need full access to the mailbox, which isn't asked for. Mail to
  an erased proxy is not understood.

## 2. Scheduled jobs run through the night

`import-luma`, `import-members`, `read-gmail` and `send-mailings` run
every hour, not only from 06:00 to 23:00 UTC, so replies are relayed and
queued letters sent overnight. Their tests and the comments about saving
the database's overnight wakes change with them. Mailings still can't be
scheduled before `SENDING.firstHour`.

## 3. The letters inbox and proxies

**The account.** The letters inbox has a staff account, so someone
logged in as it connects its Gmail on `/staff/me`. When the logged-in
account is `LETTERS_INBOX`, the connection also asks for `gmail.modify`
(https://developers.google.com/gmail/api/auth/scopes), for labels and
erasure; other accounts' scopes are unchanged. The mailing writer leaves
it out of Sent from, and the server refuses it as a mailing's sender.

**Proxies.** A `proxies` table has a row per tag, unique and lowercase:

- **A supporter's proxy** is keyed by their email address, lowercased
  and trimmed, and named from the name on their first letter:
  `jane.smith`, or `jane.smith.2` if that's taken. It's the same in every
  letter they send, as casework systems file constituents by email
  address.
- **An MP's proxy** is named the first time they're written to,
  `meg.hillier.mp`, and kept if their name or address changes.

Tags are easy to guess. That's harmless, as only authenticated mail from
a letter's two parties is relayed (step 5).

**Columns.** `letters_from_supporters` gains `proxy_id`, the supporter's
proxy, and `reply_hash` is renamed `postmark_mailbox`, null for new
letters; its check that only imported letters lack one changes to allow
them. Letters gain the status `queued`, and `email_sends` the purposes
for the supporter's copy, relays and notices to the supporter.

**Fixtures.** The fake Gmail in `tests/fixtures/outside-services.ts`
gains a letters inbox that keeps what's sent to its addresses and serves
it to `read-gmail`, so relays can be driven end to end.

## 4. Sending

`submitLetter` sends two emails from the letters inbox:

- **The letter**, to the MP's address, from the supporter's proxy, with
  no Cc or Bcc. Its subject, text, HTML and attachments are as now.
- **The supporter's copy**, the same letter with one line above it
  saying what it is: a copy of their letter to their MP, whose reply will
  come here, and that replying reaches the MP. That line, and the sent
  page saying the same, are placeholder copy.

  ```
  From:     "Jane Smith (via PauseAI)" <letters+jane.smith@example.org>
  To:       "Meg Hillier MP (via PauseAI)" <letters+meg.hillier.mp@example.org>
  Reply-To: "Meg Hillier MP (via PauseAI)" <letters+meg.hillier.mp@example.org>
  Bcc:      jane.smith@example.com
  ```

  Reply and Reply all reach only our proxies. The supporter isn't Bcc'd
  on the letter itself, whose To is the MP's real address: a Reply all
  would go straight to the office, revealing their address. Every relay
  to the supporter names this copy's Message-ID in its In-Reply-To and
  References, so the conversation is one thread in their mailbox. The
  copy delivered to the MP's proxy lands in the letters inbox and is
  skipped as our own.

Nothing goes to policy@. The form, and `submitLetter` on the server,
refuse a sender email that is the letters inbox, one of its proxies, or
`POLICY_INBOX`.

**The send queue.** Once a letter passes its checks it's saved as
`queued` and never deleted for failing to send, so the supporter never
sees an error after that point.

1. The request tries to send the letter and the copy at once, so
   normally they go within a second.
2. Whatever stops them stays queued with its reason: the daily limit,
   Gmail's rate limit, Gmail being down, or a broken connection. The sent
   page then says the letter will go soon, in placeholder copy.
3. Every hour, `send-mailings` works through the queue: relays waiting
   to be retried first, so an MP's reply is never held up behind new
   letters, then letters, oldest first, as far as the daily limit allows.

A letter to an MP whose address is blocked, as it bounced before, is
queued too, rather than refused as now (`not_sent`, with an error). It
waits for staff to unblock or change the address, which sends it (step
5, "Bounces"), and the sent page says it will go once their MP's address
works, in placeholder copy.

The letters inbox's daily limit is 1,950 of Google's 2,000
(https://support.google.com/a/answer/166852), counted over the past 24
hours with letters, copies, relays and notices all counting. Nobody else
sends from it, so it's higher than a staff account's 1,800; the few
spare cover any difference between our count and Google's, as going over
can stop the account sending for up to 24 hours.

## 5. Reading and relaying

`read-gmail` reads the letters inbox, Spam included, and sorts every
message it receives into one of these:

- **From the MP's office to the supporter's proxy:** relayed to the
  supporter from the MP's proxy. The office is the address the letter
  went to, or any parliament.uk address in the letter's thread.
- **From the supporter to either proxy:** relayed to the MP's address
  from the supporter's proxy, naming the letter's Message-ID. This covers
  Reply all, which in some mail clients names both proxies, and a chase
  before the MP has replied.
- **Automatic replies:** relayed both ways, as with direct email: the
  office's acknowledgement to the supporter, the supporter's
  out-of-office to the office. Each is an `auto_reply` event.
- **Bounces:** never relayed (below).
- **Our own sent mail:** skipped.
- **Spam that matches no letter:** counted in the run as spam. Guessed
  proxies will get some.
- **Anything else is not understood:** an unknown proxy, a stranger,
  mail that fails authentication, or a relay over the cap. It's kept and
  fails the run, which lists each message with a Gmail link. A run with
  any such message emails `POLICY_INBOX` once, listing them with a link
  to the run, tagged `staff-alert`. Failed runs email nobody today, so
  this is new.

Every message the office or the supporter sends is kept whole, as
mailings' replies are. A relay is an event naming the message it
relayed, not a second copy.

**Which letter.** A message to a supporter's proxy belongs to one of
their letters to that MP, usually the only one, as each sender writes
once per campaign. Otherwise, in order: In-Reply-To or References naming
one of ours; the Gmail thread; a Case Ref (`(Case Ref: XX00000)` in the
subject) already seen on one of the letters; the letter's subject in the
message's; and failing those, the latest letter, flagged in the history
and the run as an uncertain match. MPs' casework replies have no
In-Reply-To or References.

**Authentication.** A relay goes out in our name, and a From can be
forged. A message is relayed only if Google's servers found it passes
DMARC (the `Authentication-Results` header added by `mx.google.com`), or,
where the From's domain has no DMARC policy, SPF or DKIM aligned with it.
The office's mail must also be from parliament.uk, whose DMARC policy is
strict, or from the exact address the letter went to. Test the rule on
real headers from MPs' replies and from the big mail providers.

**A relay is the same message:** the original's subject and MIME body,
byte for byte (text, HTML, inline images and attachments), with nothing
added. Only the headers are ours: From, To, Message-ID, and In-Reply-To
and References for threading, plus the original's `Auto-Submitted` and
`Precedence`. Anyone the office copied in isn't sent it. `send()`'s
Gmail backend gains a raw-MIME path for this.

**Bounces.** Each kind of email sent from the letters inbox has a hook
in `delivery-problems.ts`:

- **The letter, or a relay to the MP, bounces hard:** the MP's address
  is blocked and `POLICY_INBOX` alerted, as now, and the supporter gets a
  notice that their letter or message hasn't reached their MP and that
  we're looking into it. The notice is our own short email, in
  placeholder copy, from the letters inbox's plain address as "PauseAI",
  in the thread of their copy; never the raw bounce. When staff unblock
  the address (`unblock`), or the MP's address changes, everything that
  bounced to it goes back into the send queue, to the new address if it
  changed, and the supporter is told it has gone.
- **The supporter's copy, or a relay to them, bounces hard:** their
  address is blocked and later relays to them are held, the history
  saying why.
- **A soft bounce** is only noted, as Gmail keeps trying.
- **A bounce that matches nothing we sent** is not understood.

**No loops.** A relay can set off an automatic reply, which is relayed
in turn, so:

1. **Each letter has a cap on relays,** 5 in an hour and 20 in a day. A
   message over it is not understood, so a loop nobody foresaw stops
   after a few messages, staff are told, and it can't use up the daily
   limit.
2. **A relayed automatic reply keeps its `Auto-Submitted` and
   `Precedence` headers,** so responders that follow RFC 3834
   (https://www.rfc-editor.org/rfc/rfc3834) don't answer it.
3. **Automatic mail is recognised by every common sign** in
   `isMachineReply`: `Auto-Submitted`, `Precedence` of `auto_reply`,
   `bulk` or `junk`, `X-Autoreply`, `X-Autorespond`, and the subject.
4. **Nothing is sent to ourselves:** a relay never goes to an address of
   the letters inbox, and senders can't use one (step 4).
5. **Each message is handled once,** keyed by its Message-ID, however
   many proxies it names. A relay is recorded before it's sent and
   marked done after. If a run stops in between, the message isn't sent
   again but shown as uncertain, for a person to check.

**Labels.** Every message read is labelled in Gmail "Relayed", "Noted",
"Spam" or "Not understood", and all but the last are marked read and
archived, so the letters inbox holds only what needs a person.

## 6. The letter's history and page

The history lists, in order: the letter queued and why, if it didn't go
at once; the letter sent; the supporter's copy; each message from the
office or the supporter, and whether it was relayed or why not (address
blocked, not verified, over the cap, queued to be retried); automatic
replies; bounces, notices and resends; and uncertain matches. Its labels
and reasons are placeholder copy. The page shows the thread from the
kept messages, with "Open in Gmail" for the letters inbox and the backend
shown as Gmail. Old letters' histories are unchanged.

## 7. What the supporter wrote

A campaign's letters are mostly its text, which changes with deploys.
The letter's page shows what the supporter added, changed or removed.

- **The starting draft is kept with the letter.** `submitLetter`
  rebuilds the draft the form began with (`draftLetter`, from the same
  MP, constituency, sender and address) and stores its text on the
  letter, so each letter carries the text it was written from and
  nothing needs versioning.
- **A deploy between opening the form and sending** would change the
  rebuilt draft. The form sends a hash of the draft it was given; if the
  server's rebuild differs, the stored draft is marked approximate.
- **An "own words" figure,** the share of the sent letter that isn't in
  the draft, is worked out at send time and stored, so the letters table
  can sort and filter by it.

On the letter's page, a switch above the first message shows it three
ways, comparing the draft and the sent letter word by word when shown:

- **Changes**, the default: the sent letter, with what the supporter
  added highlighted and what they removed struck through.
- **As sent:** what the MP got.
- **Starting draft:** the campaign's text as the supporter was given it.

An approximate draft is said so above the switch. Letters with no
stored draft, from before this or imported, show the letter alone. Check
the gallery for a tab or segmented switch before writing one (the
mailings list has tabs); a new component gets a gallery example.

## 8. Storyboard

The replies section (`tests/storyboard/replies.spec.ts`) is redone, with
every email pictured and the letter's history after each step:

1. A letter is sent: the MP's email, the supporter's copy, and the
   history, showing Gmail as the backend.
2. The MP replies and it's relayed to the supporter; the supporter
   answers and it's relayed to the MP.
3. A reply with HTML and attachments is relayed unchanged.
4. Automatic replies are relayed both ways. Two that keep answering each
   other stop at the cap, and the run emails staff.
5. A stranger writes to a proxy, and a forged MP's reply fails DMARC.
   Neither is relayed; the run fails and lists both. Spam to a guessed
   proxy is counted and doesn't fail the run.
6. The letter bounces: staff are alerted and the supporter told; staff
   unblock the MP's address and the letter goes again. The supporter's
   own address bounces, so the next reply isn't relayed, and the history
   says why.
7. A letter over the daily limit is queued: the sent page says it will
   go soon, and the next hour's run sends it after a waiting relay.
8. A letter with a paragraph of the supporter's own and a cut sentence:
   its page shows the changes, then as sent, then the starting draft.
9. An old letter's reply comes through Postmark and is forwarded as
   before (one of today's flows, kept).

An existing mailings flow pictures the Sent from list without the
letters inbox. `docs/testing.md`, "What the storyboard covers", says what
the section now drives.

## 9. Docs

As things are once built: `docs/domain-concepts.md` ("Letters", and
sending and reading mail), `docs/development.md` (`LETTERS_INBOX`, and
connecting the letters inbox in production), `.env.example`, and
`README.md`'s line on Email your MP.

## Later, not now: Gmail push for the letters inbox

Hourly reading means a supporter can wait up to an hour for their MP's
reply. If that matters, Gmail can tell us of new mail within seconds
through Google Cloud Pub/Sub
(https://developers.google.com/gmail/api/guides/push):

- A topic that Gmail's service account may publish to, and a push
  subscription to a route that checks Google's signed token and starts a
  background function to read the letters inbox.
- `users.watch` on the letters inbox, limited to Inbox and Spam, renewed
  daily by the hourly run, as a watch lasts 7 days.
- A lock, so a push and the hourly run never read the inbox at once.

Only the letters inbox: staff accounts get mail all day that isn't ours,
so pushes would keep the database awake for nothing. The hourly run stays
for every account, as pushes can be dropped.
