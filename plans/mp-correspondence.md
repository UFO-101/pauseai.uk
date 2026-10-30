# Conversations with politicians, from the policy mailbox

Since 29 October 2026, policy@pauseai.uk (`POLICY_INBOX`) has been a
Gmail account. Before that it was the Google Group policy-archive
(https://groups.google.com/a/pauseai.uk/g/policy-archive), which got the
same mail: supporters' Bcc'd letters, the replies, and volunteers' Cc's.
The site can read the Gmail account as it reads the Gmail accounts mailings are sent from. That
gives two things:

1. **Replies to supporters' letters, kept whole**, as PauseAI letters'
   replies are, with a thread on the letter's page.
2. **Every email between someone and an MP that policy@ is copied on**,
   including volunteers' own emails to their MP, which they Cc to us.
   Today those are only in Gmail and the group.

The unit is the **conversation**: one email thread with a politician. A
conversation is joined to a letter (a supporter's, or PauseAI's in a
mailing) only when the match is certain. Otherwise it stands alone,
under its politician. Nothing is lost, and nothing is wrongly joined.

## How it works now

**PauseAI's letters** (mailings) go from a staff member's connected Gmail
(`lib/server/mailing-channels.ts`). Every hour, `lib/server/gmail-reading.ts`
reads each connected account's history since the last run. It fetches
only the threading headers, and keeps a message whole (in Blobs, with a
row in `letter_replies`) only if it answers one of our letters, by
Message-ID or Gmail thread. Automatic replies and bounces are noted on the
letter. The letter's page shows the thread (`lib/server/letter-threads.ts`).

**Supporters' letters** (`lib/server/mp-letters.ts`) go by Postmark from
the letter's own address, `jane.smith.482913@letters.pauseai.uk`:

- To: the MP. Bcc: `POLICY_INBOX`, which holds the only copy of the text.
- Reply-To: the sender, `"PauseAI Policy Team" <POLICY_INBOX>` and the
  letter's address, so a reply-all reaches all three.
- A reply that reaches the letter's address comes in through Postmark's
  inbound webhook (`forwardReply` in `lib/server/postmark-webhooks.ts`).
  That adds a `replied` or `auto_reply` event, keeping who and when but not
  the text, and forwards it from noreply@ to `POLICY_INBOX` and the
  sender, unless they're already in its To or Cc.
- The letter's page has "Copy Gmail search" for the Bcc'd copy
  (`getSupporterLetter` in `lib/server/letters.ts`).

## What the group's mail shows

From francis@'s copy of the group's mail, 15 to 29 October 2026 (the
only part he has), read on 30 October:

- **The Bcc'd copy** of a site letter has `Message-Id:
  <postmarkId@mtasv.net>` and `List-ID: <policy.pauseai.uk>`.
- **The group rewrites the From** of senders whose domain publishes a
  strict DMARC policy (Yahoo, parliament.uk): it arrives as
  `"'Chris Coghlan MP' via PauseAI UK" <policy@pauseai.uk>`. The real
  sender is in `X-Original-From` and `Reply-To`, so the import reads
  those, never From alone.
- **MP offices reply through a shared casework system,** not from Outlook.
  Every office's reply seen went through SendGrid on Parliament's
  behalf: a Message-ID `@geopod-ismtpd-N`, DKIM `parliament.uk` with
  selector `cw`, bounces to `em4989.parliament.uk`, and `(Case Ref:
  XX00000)` added to the subject. These replies have **no In-Reply-To
  or References**, so they never thread by Message-ID. They go To one
  address, with no Cc.
- **They answer the From address.** Replies to the old form's letters
  (From `"Name via PauseAI" <policy@pauseai.uk>`, Cc the sender) went to
  policy@ alone, not the sender. No reply to a site letter was seen in
  the group, and none was forwarded there from a letter's address
  (question 8).
- **People forward replies by hand.** Supporters forward their MP's reply
  to policy@, and policy@ forwards replies on to supporters.

So for a casework system's reply, the certain joins below don't apply.
What it does have: the MP's address, `Re: <the letter's subject>`, a
Case Ref, and often the letter quoted with its From, Sent, To and Cc
lines. Joining on the MP plus the subject plus the quoted Sent time
and Cc (the sender's address) is close to certain, and needs a rule of
its own.

## How letters are sent

What was learnt by 30 October 2026, from Postmark, production and the
group's mail:

- The site sent 34 letters to MPs from 16 to 29 October. Mimecast,
  Parliament's mail filter, accepted every one, about half after a
  first `451` (greylisting a sender it doesn't know). Accepted isn't
  delivered: what Mimecast then does with them can't be seen.
- Nothing came back from any of them: no reply or automatic reply at a
  letter's address (Postmark has had 3 inbound messages ever, all
  tests), no auto-responder bounces, nothing at policy@. Production's
  two `replied` events are both tests. The old form's letters, From
  policy@, got automatic replies within minutes (2 of 24 on 15 October)
  and casework replies within weeks.
- So either the letters are being filtered, or offices answer the first
  Reply-To, the constituent's own address, where we can't see it.
  Asking a few senders, and a friendly office to look in its junk and
  held mail, would settle it.

WriteToThem, which has sent constituents' letters to MPs for twenty
years, does it differently (question 9 has the details). Unless question
9 decides otherwise, a supporter's letter goes as WriteToThem's do:

- **From** the constituent's name at the letter's own address, as now.
- **Reply-To** the constituent alone. Policy@ comes out of it.
- **Bcc** policy@, as now: our copy of the text.
- **Plain text**, a subject saying it's from a constituent, and links to
  the campaign's documents instead of PDFs attached.
- **The campaign gives points**, which the form asks the person to put
  in their own words, not one text for everyone.
- **Everything that reaches the letter's address** (a reply to the From,
  an automatic reply) is forwarded to the constituent and policy@ and
  kept, as the webhook does now, with its text (part 1).
- **The constituent is asked**, in the confirmation, to copy policy@ when
  they get a reply. Policy@ then has the replies people pass on, which
  part 1 reads.

The other options in question 9, sending from policy@ with the
constituent on Cc, or from the constituent's own email, would change
this section, and part 1 only in where replies come from.

## 1. Replies to supporters' letters

Policy@ is connected like a staff member's Gmail and read hourly with the
others. `letterAnswered` also matches supporters' letters:

- **The Bcc'd copy** is the letter. It's matched by its Message-ID,
  `<postmarkId@mtasv.net>` (Postmark's `MessageID`, already in
  `email_sends.message_id`). It's kept whole, as the letter's first message,
  so the letter page can show its text. At the moment the site keeps no text
  of a supporter's letter, so this needs the data-protection change below.
- **A reply that threads** (In-Reply-To or References naming that
  Message-ID) is kept in `letter_replies`. Casework systems' replies
  don't thread, so most are joined by the rule for them (part 2,
  "Joining a conversation to a letter"): the MP, `Re: <subject>`, and
  the letter quoted.
- **A reply that reaches the letter's own address** comes in through
  Postmark's webhook, which keeps it whole too: Blobs and
  `letter_replies`, with `account` `letters.pauseai.uk` and a nullable
  `gmail_message_id`. It's forwarded to policy@ and the constituent; the
  forwarded copy, read again from policy@, is skipped (from noreply@,
  Tag `forwarded-reply`).
- **A reply a constituent forwards or copies to policy@** is a message
  from a supporter quoting the MP's, joined by the same rule as a
  casework reply.

The thread page then works for both kinds of letter.
`LetterThread`/`letter-threads.ts` takes the letter's first message from
the kept copy when the letter has no mailing to rebuild it from.

## 2. Every conversation with a politician

### Where the mail comes from

- **Policy@'s Gmail, since 29 October 2026.** It's connected like any
  staff Gmail and read hourly with the others, with the option "Keep all
  its conversations with politicians" turned on. Only policy@ and the
  archive account below have it.
- **The group's archive, before that, from Joseph's Gmail.** Joseph was a
  member of policy-archive getting every email, so his mailbox has a copy
  of each message with its original headers. He connects his Gmail on
  `/staff/me`, as for sending mailings, using the existing OAuth flow and
  scopes. "Import the policy archive" under Import data then reads only
  the group's mail, with a Gmail search on its List-Id (`list:`,
  https://support.google.com/mail/answer/7190), paged, from the oldest
  message. Until 29 October the group was policy@pauseai.uk. It was then
  renamed policy-archive@ and policy@ became the Gmail account, so the
  search is `list:policy@pauseai.uk OR list:policy-archive@pauseai.uk`.
  Mail to the Gmail account has no List-Id, so the search can't overlap
  with what's read from policy@ itself. It's a one-off that can be run again: what's already kept is
  skipped. It covers only what reached Joseph, from when he joined.
- **Gmail's own messages in each case.** The same message can arrive in
  both mailboxes, from the group and in policy@, and later again in
  someone else's. It's kept once, keyed by its Message-ID, with the first
  account it was read from.

Google has no API that reads a group's messages, and Vault isn't in
PauseAI's Workspace, so a member's mailbox is the only way in.

### What's kept

A message is kept if a politician's address is in its From, To or Cc, or
it's in the thread of one that is.

- `conversations`: the politician; the account and Gmail thread it was
  read from; its subject; who it's with (the first address that isn't
  the politician's or ours), linked to a supporter by email address as
  form entries are (`linkSupporters`); and the letter it's joined to, if
  any.
- Its messages are in `letter_replies`, renamed to
  `conversation_messages`, with a nullable `letter_id` and a
  `conversation_id`. They're kept whole in Blobs, as today.
- Its first message from someone other than the politician is shown as
  the letter. "Replied" means a later message from the politician's side.

### Joining a conversation to a letter

The rule is: join only when the match is certain. These matches are
certain:

- **By Message-ID.** A message whose Message-ID, In-Reply-To or
  References names a letter's: a mailing's Gmail send
  (`email_sends.rfc_message_id`), or a supporter's letter sent through the
  site (`<postmarkId@mtasv.net>`). This covers both the Bcc'd copy and a
  reply-all that threads.
- **By the letter's own address.** Any message to a supporter's letter's
  `…@letters.pauseai.uk` address, threaded or not.
- **By Gmail thread,** in the mailbox a mailing was sent from, as today.

Historic letters have no Message-ID. Airtable's Emails table (PauseAI's
emails, 5,683 records) has only the politician, the time it was recorded,
which mailing and whether it was personalised. "Web form emails"
(supporters' letters through pauseai.info's old form, 733 records) has
the MP's address, the subject, the sender's name and email, and "Email
Sent Time". For these, a conversation is joined if exactly one
letter fits:

- **A web-form letter:** a message to the MP's address, with the same
  subject, within a few minutes of "Email Sent Time". With the sender's
  name in the From or Reply-To too, that's close to certain.
- **A PauseAI email from Airtable:** a message to the politician's
  address within a few minutes of its Timestamp. Several mailings went the
  same day, so the subject must also fit the mailing's: a pattern per
  mailing, kept with it (`mailings.airtable_subject` or similar). Most
  of them were sent from Joseph's Gmail, and some from others' accounts.
  So the archive import also searches the Sent mail of each connected
  account, `in:sent to:<address>` around each letter's time. A match there
  also gives the Gmail thread, so the replies to Joseph, which may never
  have reached the group, join the conversation as a mailing's do today.
  Letters sent from an account that isn't connected stay unjoined, unless
  a copy reached the group.
- **How many minutes:** measured, not guessed. A dry run of the import
  reports, for each historic letter, the gap to its nearest candidate,
  and whether it found none, one or several. The window is set from that,
  and ambiguous ones stay unjoined.

Once joined, the letter keeps the Message-ID it was found by. That makes
every later reply that threads a certain match too.

Anything else stands alone: a caseworker's fresh reply, a volunteer's Cc,
a thread the politician started. It appears on the politician's page and
in the letters list. Joining one by hand ("This is the reply to…",
offering the letters to that politician from around then) is left for
later.

### Not counted twice

A message in a site letter's thread (part 1) joins that letter's
conversation, so a supporter's Bcc'd copy never becomes a second
conversation. The same message read from policy@, the archive and a staff
Gmail is kept once, by Message-ID.

### Staff pages

- The letters page lists conversations not joined to a letter alongside
  letters, as "Copied to us", with a filter.
- A conversation's page is the thread (`LetterThread`), with whoever it's
  with linked to their supporter page.
- A letter's page shows its conversation's thread, for both kinds of
  letter.
- The politician's page lists all of them.

## Data protection

These changes touch personal data, so `docs/data-protection.md`, the
privacy policy and erasure need changing before anything is built:

- **Letters to MPs**: the letter's text and the MP's replies are kept
  (in Blobs, backed up by the backup Worker), not only in Gmail.
- **A new row, conversations copied to us**: a volunteer's own emails
  with their MP, with their text. Their sources are the volunteer Cc'ing
  us, and the group's archive read from a member's mailbox. Lawful basis
  as letters to MPs, with Article 9(2)(d) for the political opinion. They're
  kept until erased, and erasing a supporter deletes their conversations
  and the blobs.
- **Joseph's mailbox:** the site reads the group's mail from it (the
  `list:` search), plus his sent emails to politicians that match an
  Airtable letter and their threads. It keeps only messages with a
  politician. The hourly read already fetches the headers of every new
  message in a connected account. That should be stated.
- The privacy policy needs a line saying that copying us into an email to
  your MP means we keep it. (Placeholder copy, ⁂, for a person to write.)

## Open questions

1. Is policy@ already connected as a staff account, and who signs in as
   it? Connecting requires the logged-in staff member's own address
   (`lib/server/gmail-accounts.ts`), so policy@ needs a staff account of
   its own.
2. Which addresses count as an MP's: only `notable_people.email`, or any
   `@parliament.uk`? And which other politicians: peers, MSPs, MSs,
   councillors? Should an address we don't know yet be suggested as one of
   theirs?
3. A thread the MP started, or one between a volunteer and the MP's
   caseworker with no MP address: keep it or not?
4. When did Joseph join the group, and was he always on "every email"?
   Does the `list:` search find its mail as expected? (Check in his
   Gmail before building.)
5. Should any other staff account have "Keep all its conversations with
   politicians" turned on?
6. Should policy@ be on Cc rather than Bcc, so the office sees we're
   copied and a reply-all includes us? It's a choice about what the MP
   sees, not a technical one.
7. Airtable's emails went mostly from Joseph's Gmail, some from others'.
   Whose? They'd need to connect their Gmail too, for theirs to be
   joined.
8. How well do the Bcc to policy@, the Reply-To with three addresses
   (the sender, policy@ and the letter's own address) and the letter's
   own address (`<name>.<digits>@letters.pauseai.uk`, earlier
   `reply+<hash>@`) actually work? They seem not to. Production has two
   `replied` events in all, on 30 October 2026, from every source, while
   the group got many replies. Also, in the group's mail
   from 15 to 29 October, every MP reply found was addressed to policy@
   alone, with no Cc, and no reply was forwarded from the letter's
   address. If offices' casework systems reply to one address only, the
   letter's address and the webhook catch little, the sender never gets
   the reply unless someone forwards it, and the design of part 1 should
   change: perhaps Reply-To policy@ alone, with the reply read from
   Gmail and forwarded to the sender from there.
   Postmark, on 30 October: 34 letters sent to MPs from 16 to 29
   October; 3 inbound messages ever, all tests; no auto-responder
   bounces; the MX for letters.pauseai.uk is Postmark's. The Bcc'd
   copies carry the full Reply-To. No reply or automatic reply to a site
   letter reached policy@ either. So either no office has answered yet,
   or answers go to the sender's own address, first in Reply-To. Asking
   a few senders would settle it.
9. How should a supporter's letter be sent? WriteToThem's source
   (github.com/mysociety/writetothem, `perllib/FYR/Queue.pm`
   `make_representative_email` and `deliver_email`, `bin/handlemail`)
   sends From the constituent's name at a per-message address on its own
   domain, which is also the Return-Path; Reply-To the constituent alone;
   To the MP; nobody copied; plain text, no attachments; subject "Letter
   from your constituent <name>". Mail to the per-message address,
   automatic replies included (matched by subject), is forwarded to the
   constituent; near-identical messages are held for a moderator
   (`perllib/FYR/AbuseChecks.pm`). MPs are told replies go straight to
   the constituent, so offices' systems presumably answer the Reply-To.
   Ours differs: three addresses in Reply-To, the constituent first;
   Postmark's fixed Return-Path; HTML with PDFs; one text for everyone;
   a new domain. Options:
   - Follow WriteToThem: Reply-To the constituent alone, plain text,
     links instead of PDFs, the points in the person's own words, and
     everything reaching the letter's address forwarded to them and
     policy@. We'd see replies only when the constituent Cc's or
     forwards to policy@.
   - Send from policy@, as the old form did, with the constituent on Cc.
     Offices answer policy@, so we see every reply, and forward it.
   - Have the constituent send it from their own email, prefilled, with
     policy@ on Cc, as volunteers already do. This is the one route seen
     getting replies, at the cost of people dropping out before sending.
