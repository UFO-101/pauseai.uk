# Conversations with politicians, from the policy mailbox

Since 29 October 2026, policy@pauseai.uk (`POLICY_INBOX`) has been a Gmail
account. Before that it was a Google Group of the same address, since
renamed policy-archive
(https://groups.google.com/a/pauseai.uk/g/policy-archive). Both get the
same mail: supporters' letters Bcc'd to us, MPs' replies, and volunteers'
own emails to their MP with us on Cc.

The site can read the Gmail account as it reads the Gmail accounts
mailings are sent from. That gives two things:

1. **Replies to supporters' letters, kept whole**, as replies to PauseAI's
   letters are, with the thread on the letter's page.
2. **Every email between someone and a politician that policy@ is copied
   on**, including volunteers' own emails to their MP. Today those are only
   in Gmail and the group.

The unit is the **conversation**: one email thread with a politician. A
conversation is joined to a letter (a supporter's, or PauseAI's in a
mailing) only when the match is certain. Otherwise it stands alone, under
its politician. Nothing is lost, and nothing is wrongly joined.

The plan has three parts: how supporters' letters are sent (part 1),
reading the replies to them (part 2), and keeping every conversation with
a politician (part 3).

## Background

### The ways letters reach MPs

| Route | From | Copied | Reply-To | Who the office's reply reaches |
| --- | --- | --- | --- | --- |
| The site's form, since 14 October 2026 | "Jane Smith via PauseAI" <jane.smith.482913@letters.pauseai.uk>, the letter's own address | policy@ on Bcc | The sender, policy@ and the letter's address | Unknown: nothing has come back (below) |
| pauseai.info's old form, sent by Airtable through SendGrid, until 22 October 2026 | "Jane Smith via PauseAI" <policy@pauseai.uk> | The sender on Cc | Unknown | policy@ alone, so the sender sees it only if someone forwards it |
| A volunteer's own email | The volunteer | policy@ on Cc | None | The volunteer, and policy@ if the office replies to all or the volunteer forwards it |
| PauseAI's mailings | A staff member's connected Gmail | None | None | That Gmail, read hourly |

### How the site handles them now

**PauseAI's letters** (mailings) go from a staff member's connected Gmail
(`lib/server/mailing-channels.ts`). Every hour, `lib/server/gmail-reading.ts`
reads each connected account's history since the last run. It fetches
only the threading headers, and keeps a message whole (in Blobs, with a
row in `letter_replies`) only if it answers one of our letters, by
Message-ID or Gmail thread. Automatic replies and bounces are noted on the
letter. The letter's page shows the thread (`lib/server/letter-threads.ts`).

**Supporters' letters** (`lib/server/mp-letters.ts`) go by Postmark from
the letter's own address:

- To the MP, Bcc `POLICY_INBOX`, which holds the only copy of the text.
- Reply-To the sender, `"PauseAI Policy Team" <POLICY_INBOX>` and the
  letter's address, so a reply-all reaches all three.
- A reply that reaches the letter's address comes in through Postmark's
  inbound webhook (`forwardReply` in `lib/server/postmark-webhooks.ts`).
  That adds a `replied` or `auto_reply` event, keeping who and when but
  not the text, and forwards it from noreply@ to `POLICY_INBOX` and the
  sender, unless they're already in its To or Cc.
- The letter's page has "Copy Gmail search" for the Bcc'd copy
  (`getSupporterLetter` in `lib/server/letters.ts`).

### What we found, 30 October 2026

From Postmark, production, Airtable, and francis@'s copy of the group's
mail (15 to 29 October, the only part he has).

**Nothing has come back from the site's letters.**

- The site sent 34 letters to MPs from 16 to 29 October. Mimecast,
  Parliament's mail filter, accepted every one, about half after a first
  `451` (greylisting a sender it doesn't know). Accepted isn't delivered:
  what Mimecast does with them next can't be seen.
- Postmark has had 3 inbound messages ever, all tests, and no
  auto-responder bounces. The MX for letters.pauseai.uk is Postmark's, so
  replies to a letter's address would have arrived.
- Production's two `replied` events, from every source, are both tests.
- No reply or automatic reply to a site letter reached policy@, directly
  or forwarded.
- The Bcc'd copies carry the full Reply-To, so the MPs' copies do too.

**Letters from policy@ get answers.** The old form's letters got
automatic replies within minutes (2 of 24 on 15 October) and casework
replies within weeks, all to policy@ alone, not the sender. Volunteers'
own emails get replies too.

So either the site's letters are being filtered, or offices answer the
first Reply-To, the constituent's own address, where we can't see it
(question 1).

**MP offices reply through a shared casework system,** not from Outlook.
Every office's reply seen went through SendGrid on Parliament's behalf:
a Message-ID `@geopod-ismtpd-N`, DKIM `parliament.uk` with selector `cw`,
bounces to `em4989.parliament.uk`, and `(Case Ref: XX00000)` added to the
subject. They answer one address, with no Cc, and have **no In-Reply-To
or References**, so they never thread by Message-ID. What they do have:
the MP's address, `Re: <the letter's subject>`, the Case Ref, and often
the letter quoted with its From, Sent, To and Cc lines.

**The group rewrites the From** of senders whose domain publishes a
strict DMARC policy (Yahoo, parliament.uk): a reply arrives as
`"'Chris Coghlan MP' via PauseAI UK" <policy@pauseai.uk>`. The real
sender is in `X-Original-From` and `Reply-To`, so the import reads those,
never From alone.

**People forward replies by hand.** Supporters forward their MP's reply
to policy@, and policy@ forwards replies on to supporters.

**The Bcc'd copy** of a site letter has `Message-Id:
<postmarkId@mtasv.net>` and `List-ID: <policy.pauseai.uk>`.

## 1. How supporters' letters are sent

WriteToThem has sent constituents' letters to MPs for twenty years. Its
source (github.com/mysociety/writetothem: `perllib/FYR/Queue.pm`,
`make_representative_email` and `deliver_email`; `bin/handlemail`;
`perllib/FYR/AbuseChecks.pm`) sends:

- From the constituent's name at an address made for that message, on its
  own domain, which is also the Return-Path.
- Reply-To the constituent alone. To the MP, with nobody copied.
- Plain text, no attachments, subject "Letter from your constituent
  <name>".
- Mail to the per-message address, automatic replies included (matched by
  subject), is forwarded to the constituent.
- Near-identical messages are held for a moderator.

MPs are told replies go straight to the constituent, so offices' systems
presumably answer the Reply-To. Ours differs: three addresses in
Reply-To, the constituent first; Postmark's fixed Return-Path; HTML with
PDFs; one text for everyone; and a domain two weeks old.

Unless question 2 decides otherwise, a supporter's letter goes as
WriteToThem's do:

- **From** the constituent's name at the letter's own address, as now.
- **Reply-To** the constituent alone. Policy@ comes out of it.
- **Bcc** policy@, as now: our copy of the text.
- **Plain text**, a subject saying it's from a constituent, and links to
  the campaign's documents instead of PDFs attached.
- **The campaign gives points**, which the form asks the person to put in
  their own words, not one text for everyone.
- **Everything that reaches the letter's address** (a reply to the From,
  an automatic reply) is forwarded to the constituent and policy@, and
  kept with its text (part 2).
- **The constituent is asked**, in the confirmation, to copy policy@ when
  they get a reply. Policy@ then has the replies people pass on, which
  part 2 reads.

The other options in question 2 would change this part, and part 2 only
in where replies come from.

## 2. Reading replies to supporters' letters

Policy@ is connected like a staff member's Gmail and read hourly with the
others. `letterAnswered` also matches supporters' letters:

- **The Bcc'd copy** is the letter. It's matched by its Message-ID,
  `<postmarkId@mtasv.net>` (Postmark's `MessageID`, already in
  `email_sends.message_id`), and kept whole as the letter's first message,
  so the letter page can show its text. The site keeps no text of a
  supporter's letter today, so this needs the data-protection change
  below.
- **A reply that threads** (In-Reply-To or References naming that
  Message-ID) is kept in `letter_replies`. Casework systems' replies don't
  thread, so most are joined by the rule for them (part 3, "Joining a
  conversation to a letter").
- **A reply that reaches the letter's own address** comes in through
  Postmark's webhook, which keeps it whole too: Blobs and
  `letter_replies`, with `account` `letters.pauseai.uk` and a nullable
  `gmail_message_id`. It's forwarded to policy@ and the constituent. The
  forwarded copy, read again from policy@ (from noreply@, Tag
  `forwarded-reply`), is skipped.
- **A reply a constituent forwards or copies to policy@** is a message
  from a supporter quoting the MP's, joined by the same rule as a casework
  reply.

The thread page then works for both kinds of letter.
`LetterThread`/`letter-threads.ts` takes the letter's first message from
the kept copy when the letter has no mailing to rebuild it from.

## 3. Every conversation with a politician

### Where the mail comes from

- **Policy@'s Gmail, since 29 October 2026.** It's connected like any
  staff Gmail and read hourly with the others, with the option "Keep all
  its conversations with politicians" turned on. Only policy@ and the
  archive account below have it.
- **The group's archive, before that, from Joseph's Gmail.** Google has
  no API that reads a group's messages, and Vault isn't in PauseAI's
  Workspace, so a member's mailbox is the only way in. Joseph was a member
  getting every email, so his mailbox has a copy of each message with its
  original headers. He connects his Gmail on `/staff/me`, as for sending
  mailings, with the existing OAuth flow and scopes. "Import the policy
  archive" under Import data then reads only the group's mail, with a
  Gmail search on its List-Id (`list:`,
  https://support.google.com/mail/answer/7190), paged, from the oldest
  message: `list:policy@pauseai.uk OR list:policy-archive@pauseai.uk`.
  Mail to the Gmail account has no List-Id, so the search can't overlap
  with what's read from policy@ itself. It's a one-off that can be run
  again: what's already kept is skipped. It covers only what reached
  Joseph, from when he joined.
- **Airtable's emails in the Sent mail of whoever sent them.** Most of
  PauseAI's emails recorded in Airtable went from Joseph's Gmail, some
  from others'. The archive import also searches each connected account's
  Sent mail for them (see "Historic letters" below).
- **Each message once.** The same message can arrive in more than one
  mailbox: from the group and in policy@, and later again in someone
  else's. It's kept once, keyed by its Message-ID, with the first account
  it was read from.

### What's kept

A message is kept if a politician's address is in its From, To or Cc, or
it's in the thread of one that is.

- `conversations`: the politician; the account and Gmail thread it was
  read from; its subject; who it's with (the first address that isn't the
  politician's or ours), linked to a supporter by email address as form
  entries are (`linkSupporters`); and the letter it's joined to, if any.
- Its messages are in `letter_replies`, renamed `conversation_messages`,
  with a nullable `letter_id` and a `conversation_id`. They're kept whole
  in Blobs, as today.
- Its first message from someone other than the politician is shown as
  the letter. "Replied" means a later message from the politician's side.

### Joining a conversation to a letter

Join only when the match is certain.

**Certain matches:**

- **By Message-ID.** A message whose Message-ID, In-Reply-To or References
  names a letter's: a mailing's Gmail send (`email_sends.rfc_message_id`),
  or a supporter's letter sent through the site (`<postmarkId@mtasv.net>`).
  This covers both the Bcc'd copy and a reply that threads.
- **By the letter's own address.** Any message to a supporter's letter's
  `…@letters.pauseai.uk` address, threaded or not.
- **By Gmail thread,** in the mailbox a mailing was sent from, as today.

**Casework replies, and replies forwarded by a constituent,** don't
thread. They're joined on the MP, plus `Re: <the letter's subject>`, plus
the quoted letter's Sent time and Cc (the sender's address). That's close
to certain, and needs a rule of its own.

**Historic letters** have no Message-ID. Airtable's Emails table
(PauseAI's emails, 5,683 records) has only the politician, the time it
was recorded, which mailing and whether it was personalised. "Web form
emails" (supporters' letters through pauseai.info's old form, 733
records) has the MP's address, the subject, the sender's name and email,
and "Email Sent Time". A conversation is joined if exactly one letter
fits:

- **A web-form letter:** a message to the MP's address, with the same
  subject, within a few minutes of "Email Sent Time". With the sender's
  name in the From or Reply-To too, that's close to certain.
- **A PauseAI email from Airtable:** a message to the politician's address
  within a few minutes of its Timestamp. Several mailings went the same
  day, so the subject must also fit the mailing's: a pattern per mailing,
  kept with it (`mailings.airtable_subject` or similar). The import
  searches each connected account's Sent mail, `in:sent to:<address>`
  around each letter's time. A match there also gives the Gmail thread,
  so the replies to Joseph, which may never have reached the group, join
  the conversation as a mailing's do today. Letters sent from an account
  that isn't connected stay unjoined, unless a copy reached the group.
- **How many minutes** is measured, not guessed. A dry run of the import
  reports, for each historic letter, the gap to its nearest candidate, and
  whether it found none, one or several. The window is set from that, and
  ambiguous ones stay unjoined.

Once joined, the letter keeps the Message-ID it was found by, so every
later reply that threads is a certain match too.

**Anything else stands alone:** a caseworker's fresh reply that matches
no rule, a volunteer's Cc, a thread the politician started. It appears on
the politician's page and in the letters list. Joining one by hand ("This
is the reply to…", offering the letters to that politician from around
then) is left for later.

### Not counted twice

A message in a site letter's thread (part 2) joins that letter's
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

- **Letters to MPs:** the letter's text and the MP's replies are kept (in
  Blobs, backed up by the backup Worker), not only in Gmail.
- **A new row, conversations copied to us:** a volunteer's own emails with
  their MP, with their text. Their sources are the volunteer Cc'ing us,
  and the group's archive read from a member's mailbox. Lawful basis as
  letters to MPs, with Article 9(2)(d) for the political opinion. They're
  kept until erased, and erasing a supporter deletes their conversations
  and the blobs.
- **Joseph's mailbox:** the site reads the group's mail from it (the
  `list:` search), plus his sent emails to politicians that match an
  Airtable letter, and their threads. It keeps only messages with a
  politician. The hourly read already fetches the headers of every new
  message in a connected account. That should be stated.
- **The privacy policy** needs a line saying that copying us into an
  email to your MP means we keep it. (Copy for a person to write.)

## Open questions

### Sending

1. **Where do replies to the site's letters go?** Either Mimecast is
   filtering the letters, or offices answer the first Reply-To, the
   constituent. Ask a few of the 34 senders whether they've had a reply
   or an acknowledgement, and from which address, and ask a friendly
   office to look in its junk and Mimecast's held mail for anything from
   `@letters.pauseai.uk`.
2. **How should a supporter's letter be sent?**
   - Follow WriteToThem (part 1). We'd see replies only when the
     constituent copies or forwards them to policy@.
   - Send from policy@, as the old form did, with the constituent on Cc.
     Offices answer policy@, so we see every reply, and forward it.
   - Have the constituent send it from their own email, prefilled, with
     policy@ on Cc, as volunteers already do. This is the one route seen
     getting replies, at the cost of people dropping out before sending.
3. **Should policy@ be on Cc rather than Bcc,** so the office sees we're
   copied and a reply-all includes us? It's a choice about what the MP
   sees, not a technical one.

### Accounts

4. **Is policy@ already connected as a staff account, and who signs in as
   it?** Connecting requires the logged-in staff member's own address
   (`lib/server/gmail-accounts.ts`), so policy@ needs a staff account of
   its own.
5. **When did Joseph join the group, and was he always on "every
   email"?** Does the `list:` search find its mail as expected? Check in
   his Gmail before building.
6. **Who else sent Airtable's emails?** They went mostly from Joseph's
   Gmail, some from others'. Those people would need to connect their
   Gmail too, for their letters to be joined.
7. **Should any other staff account have "Keep all its conversations with
   politicians" turned on?**

### What counts

8. **Which addresses count as an MP's:** only `notable_people.email`, or
   any `@parliament.uk`? And which other politicians: peers, MSPs, MSs,
   councillors? Should an address we don't know yet be suggested as one of
   theirs?
9. **A thread the MP started, or one between a volunteer and the MP's
   caseworker with no MP address:** keep it or not?
