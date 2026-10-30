# Letters to MPs, and conversations with politicians

Two aims:

1. **Supporters' letters get answered, and we see the answers.** A letter
   sent through the site reaches the MP's inbox, the office replies, and
   the reply is kept with the letter and passed to the constituent.
2. **Every email between someone and a politician that policy@ is copied
   on is kept**, joined to its letter where the match is certain:
   supporters' letters, PauseAI's mailings, and volunteers' own emails to
   their MP.

The plan is in order: what to do now, the choice of how letters are sent,
then what to build.

## Where things stand

### The ways letters reach MPs

| Route | From | Copied | Reply-To | Who the office's reply reaches |
| --- | --- | --- | --- | --- |
| The site's form | "Jane Smith via PauseAI" <jane.smith.482913@letters.pauseai.uk>, the letter's own address | The sender on Cc, policy@ on Bcc | None | The letter's address, which forwards it to the sender and policy@; the sender too, on a reply-all |
| A volunteer's own email | The volunteer | policy@ on Cc, often because Joseph asked them to | None | The volunteer, and policy@ if the office replies to all or the volunteer forwards it |
| PauseAI's mailings | A staff member's connected Gmail | None | None | That Gmail, read hourly |

pauseai.info's old form, now retired, sent from policy@ with the sender on
Cc. Its letters' replies went to policy@ alone.

### How the site handles them

**PauseAI's letters** (mailings) go from a staff member's connected Gmail
(`lib/server/mailing-channels.ts`). Every hour, `lib/server/gmail-reading.ts`
reads each connected account's history since the last run. It fetches
only the threading headers, and keeps a message whole (in Blobs, with a
row in `letter_replies`) only if it answers one of our letters, by
Message-ID or Gmail thread. Automatic replies and bounces are noted on the
letter. The letter's page shows the thread (`lib/server/letter-threads.ts`).

**Supporters' letters** (`lib/server/mp-letters.ts`) go by Postmark from
the letter's own address:

- To the MP, Cc the sender, Bcc `POLICY_INBOX`, which holds the only copy
  of the text. With no Reply-To, a reply goes to the letter's address.
- Automatic replies sent to Postmark's Return-Path come back as bounces of
  type AutoResponder and add an `auto_reply` event to the letter
  (`recordAutoResponder` in `lib/server/postmark-webhooks.ts`).
- Mail to the letter's address comes in through Postmark's inbound webhook
  (`forwardReply`). That adds a `replied` or `auto_reply` event, keeping
  who and when but not the text, and forwards it from noreply@ to
  `POLICY_INBOX` and the sender, unless they're already in its To or Cc.
  Inbound needs Postmark's Pro plan or above: on Basic, Postmark still
  accepts the mail but drops it, with no bounce and no webhook.
- The letter's page has "Copy Gmail search" for the Bcc'd copy
  (`getSupporterLetter` in `lib/server/letters.ts`).

### What's known about getting through

- **No site letter has had a reply or an automatic reply that we've
  seen.** Mimecast, Parliament's mail filter, accepts them, often after a
  first `451` (greylisting a sender it doesn't know), but what happens
  next can't be seen from outside.
- **Letters sent from policy@ get answers:** automatic replies within
  minutes, casework replies within weeks. So do volunteers' own emails.
- **The site's letters authenticate cleanly:** SPF, DKIM for
  letters.pauseai.uk and DMARC all pass. The domain is new, the sender
  address random-looking, and every letter has the same text, in HTML,
  with two PDFs attached.
- **WriteToThem** (github.com/mysociety/writetothem: `perllib/FYR/Queue.pm`,
  `bin/handlemail`, `perllib/FYR/AbuseChecks.pm`) sends from the
  constituent's name at a per-message address on its own domain, which is
  also the Return-Path; Reply-To the constituent alone; to the MP only;
  plain text, no attachments, subject "Letter from your constituent
  <name>". It forwards whatever reaches the per-message address to the
  constituent and holds near-identical messages for a moderator. It has
  twenty years of reputation and allow-listing, and doesn't try to see
  replies, so its per-message address gets only bounces and automatic
  replies.

### What's known about replies

- **MP offices reply through a shared casework system,** through SendGrid
  on Parliament's behalf: a Message-ID `@geopod-ismtpd-N`, DKIM
  `parliament.uk` with selector `cw`, bounces to `em4989.parliament.uk`,
  and `(Case Ref: XX00000)` added to the subject. They answer one address,
  with no Cc, and have **no In-Reply-To or References**, so they never
  thread by Message-ID. What they do have: the MP's address,
  `Re: <the letter's subject>`, the Case Ref, and often the letter quoted
  with its From, Sent, To and Cc lines.
- **A forwarded reply is our own email quoting the MP's.** Re-sending the
  office's message from our server would break its SPF and DKIM. So the
  constituent gets mail from PauseAI, not their MP, and to answer they
  have to pick the MP's address out of the quote.
- **People forward replies by hand.** Supporters forward their MP's reply
  to policy@, and policy@ forwards replies on to supporters.

### The policy mailbox

policy@pauseai.uk (`POLICY_INBOX`) is a Gmail account. Before 29 October
2026 it was a Google Group, now renamed policy-archive
(https://groups.google.com/a/pauseai.uk/g/policy-archive), which got the
same mail: supporters' letters Bcc'd to us, MPs' replies, and volunteers'
emails with us on Cc.

- **The group rewrites the From** of senders whose domain publishes a
  strict DMARC policy (Yahoo, parliament.uk): a reply arrives as
  `"'Chris Coghlan MP' via PauseAI UK" <policy@pauseai.uk>`. The real
  sender is in `X-Original-From` and `Reply-To`.
- **The Bcc'd copy** of a site letter has `Message-Id:
  <postmarkId@mtasv.net>` and, in the group's archive,
  `List-ID: <policy.pauseai.uk>`.

## 1. Now: find out whether letters get through

1. **Watch for automatic replies.** Letters now go with one Cc instead of
   three Reply-To addresses. Many offices send an acknowledgement within
   minutes, so `auto_reply` events should start appearing on new letters.
   If none have after a few dozen letters, the letters are probably being
   filtered, and the Reply-To list wasn't the cause.
2. **Ask.**
   - A few senders of past letters: did they get a reply or an
     acknowledgement, and from which address?
   - A friendly MP's office: is anything from `@letters.pauseai.uk` in
     its junk or in Mimecast's held mail, and what would let it through?
   - DearMP's team, who send letters to MPs too: what gets through
     Parliament's filter?
3. **Give forwarded replies a Reply-To of the MP's address**, so the
   constituent can answer their MP straight from the forward.

## 2. Next: decide how letters are sent

What the first part finds decides this. If letters get through as they
are, keep the current route and take what's cheap from the list of
changes below. If they don't, change the route.

### Routes

- **As now, from the letter's own address through Postmark.** Replies to
  the From are forwarded to the constituent and policy@, and kept.
- **As WriteToThem does:** Reply-To the constituent alone, policy@ on Bcc.
  Offices' replies go to the constituent, so we'd see them only when the
  constituent copies or forwards them to policy@ (the confirmation asks
  them to). Their per-message address catches automatic replies and
  bounces.
- **From a Gmail account of our own,** such as letters@pauseai.uk,
  through the Gmail API, at a plus address per letter
  (letters+jane.smith@pauseai.uk), which reaches the same mailbox. Mail
  from Google's servers on our own domain may fare better than Postmark's.
  Replies are read hourly as mailings' are, and forwarded to the
  constituent. Joseph's preferred stopgap if the current route is
  filtered. To check: whether Gmail sends with a plus address as the From,
  or needs it set up as a "Send mail as" alias; and volume, as some days
  could need over 2,000 letters, Workspace's daily limit per account
  (https://support.google.com/a/answer/166852). The queue already sends
  from a cron, so letters can spread over days, or over more accounts.
- **From policy@, with the constituent on Cc**, as the old form did.
  Offices answer policy@, so we see every reply, and forward it.
- **From the constituent's own email**, prefilled, with policy@ on Cc, as
  volunteers do: by a `mailto:` link, or sent through their account by
  OAuth with the big providers. This is the route known to get replies, at
  the cost of people dropping out before sending.
- **A message box:** the MP's reply stays with us, and the constituent
  gets an email saying they have a message from their MP, with a link to
  read it and reply on the site. People are used to services that work
  like this, but it puts PauseAI between them and their MP.

### Changes worth making on any route

- **Plain text with no HTML, and links to the campaign's documents**
  instead of PDFs attached.
- **The campaign gives points, which the form asks the person to put in
  their own words**, so offices don't get one text many times over.
- **A subject that says it's from a constituent.**
- **A less random letter address:** the sender's name, with digits only
  when it's taken. Guessable addresses mean anyone could use one to reach
  a constituent through us, so forwarding to the constituent is then
  limited to mail from their MP's domain.
- **policy@ on Cc rather than Bcc,** so the office sees we're copied and a
  reply-all includes us. A choice about what the MP sees, not a technical
  one.

## 3. Then: keep replies to supporters' letters

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
  thread, so most are joined by the rule for them (part 4, "Joining a
  conversation to a letter").
- **A reply that reaches the letter's own address** comes in through
  Postmark's webhook, which keeps it whole too: Blobs and
  `letter_replies`, with `account` `letters.pauseai.uk` and a nullable
  `gmail_message_id`. It's forwarded to policy@ and the constituent as
  now. The forwarded copy, read again from policy@ (from noreply@, Tag
  `forwarded-reply`), is skipped.
- **A reply a constituent forwards or copies to policy@** is a message
  from a supporter quoting the MP's, joined by the same rule as a casework
  reply.

The thread page then works for both kinds of letter.
`LetterThread`/`letter-threads.ts` takes the letter's first message from
the kept copy when the letter has no mailing to rebuild it from.

If letters move to a Gmail account of our own (part 2), that account is
read the same way, and the Postmark parts drop out.

## 4. Then: keep every conversation with a politician

The unit is the **conversation**: one email thread with a politician. A
conversation is joined to a letter (a supporter's, or PauseAI's in a
mailing) only when the match is certain. Otherwise it stands alone, under
its politician. Nothing is lost, and nothing is wrongly joined.

### Where the mail comes from

- **Policy@'s Gmail.** It's connected like any staff Gmail and read hourly
  with the others, with the option "Keep all its conversations with
  politicians" turned on. Only policy@ and the archive account below have
  it.
- **The group's archive, from Joseph's Gmail.** Google has no API that
  reads a group's messages, and Vault isn't in PauseAI's Workspace, so a
  member's mailbox is the only way in. Joseph was a member getting every
  email, so his mailbox has a copy of each message with its original
  headers. He connects his Gmail on `/staff/me`, as for sending mailings,
  with the existing OAuth flow and scopes. "Import the policy archive"
  under Import data then reads only the group's mail, with a Gmail search
  on its List-Id (`list:`, https://support.google.com/mail/answer/7190),
  paged, from the oldest message:
  `list:policy@pauseai.uk OR list:policy-archive@pauseai.uk`. Mail to the
  Gmail account has no List-Id, so the search can't overlap with what's
  read from policy@ itself. It's a one-off that can be run again: what's
  already kept is skipped. It covers only what reached Joseph, from when
  he joined.
- **Airtable's emails in the Sent mail of whoever sent them.** Most of
  PauseAI's emails recorded in Airtable went from Joseph's Gmail, some
  from others'. The archive import also searches each connected account's
  Sent mail for them (see "Historic letters" below).
- **Each message once.** The same message can arrive in more than one
  mailbox: from the group and in policy@, and later again in someone
  else's. It's kept once, keyed by its Message-ID, with the first account
  it was read from. The group's rewritten From is read past, to
  `X-Original-From` and `Reply-To`.

### What's kept

A message is kept if a politician's address is in its From, To or Cc, or
it's in the thread of one that is.

- `conversations`: the politician; the account and Gmail thread it was
  read from; its subject; who it's with (the first address that isn't the
  politician's or ours), linked to a supporter by email address as form
  entries are (`linkSupporters`); and the letter it's joined to, if any.
- Its messages are in `letter_replies`, renamed `conversation_messages`,
  with a nullable `letter_id` and a `conversation_id`. They're kept whole
  in Blobs, as now.
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
- **By Gmail thread,** in the mailbox a mailing was sent from, as now.

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
  the conversation as a mailing's do now. Letters sent from an account
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

A message in a site letter's thread (part 3) joins that letter's
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

Parts 3 and 4 touch personal data, so `docs/data-protection.md`, the
privacy policy and erasure change before they're built:

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

## Questions to answer before building

### Accounts

1. **Is policy@ already connected as a staff account, and who signs in as
   it?** Connecting requires the logged-in staff member's own address
   (`lib/server/gmail-accounts.ts`), so policy@ needs a staff account of
   its own.
2. **When did Joseph join the group, and was he always on "every
   email"?** Does the `list:` search find its mail as expected? Check in
   his Gmail before building.
3. **Who else sent Airtable's emails?** They went mostly from Joseph's
   Gmail, some from others'. Those people would need to connect their
   Gmail too, for their letters to be joined.
4. **Should any other staff account have "Keep all its conversations with
   politicians" turned on?**

### What counts

5. **Which addresses count as an MP's:** only `notable_people.email`, or
   any `@parliament.uk`? And which other politicians: peers, MSPs, MSs,
   councillors? Should an address we don't know yet be suggested as one of
   theirs?
6. **A thread the MP started, or one between a volunteer and the MP's
   caseworker with no MP address:** keep it or not?
