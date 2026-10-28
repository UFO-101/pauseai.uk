# Email to politicians

Mailings to politicians go from a staff member's own Gmail, and the whole
thread can be read in `/staff`. Then Joseph stops using Airtable.

Builds on `plans/mailings.md`. Politician data is done: every body synced
from Airtable, asks and their statuses, PauseAI's emails back to 2025,
the web form letters and Go to Parliament.

Two pull requests:

1. **Gmail**: mailings sent from Gmail, with bounces and threads.
2. **Leave Airtable**: politicians and asks edited in the site; the
   syncs stop.

## Rules

- **From a person, not bulk.** Like one letter with a big BCC: no
  unsubscribe link, no consent check. Blocks and being in office are
  checked at send time.
- **We keep PauseAI's letters and politicians' replies in full**, as
  public figures in their public role. Not supporters' letters or their
  replies.
- **Airtable is read, never written**, until it's left.

## 1. Gmail

1. **Try Gmail by hand.** From a test account, send to a domain that
   doesn't exist, a mailbox that doesn't exist and an auto-replier, and
   keep what comes back, anonymised, as fixtures. Check that
   `https://mail.google.com/mail/u/{sender}/#all/{threadId}` opens a
   thread; it isn't documented.
2. **Connect Gmail.** Joseph, as Workspace admin, makes a Google Cloud
   project with an Internal consent screen, so only pauseai.uk accounts
   can grant it and Google needn't verify it
   ([user type](https://support.google.com/cloud/answer/15549945)).
   Scopes `gmail.send` and `gmail.readonly`
   ([scopes](https://developers.google.com/workspace/gmail/api/auth/scopes)).
   `staff_accounts` keeps the refresh token, encrypted, and the last
   `historyId` read.
3. **The Gmail channel.** `send()` takes a backend: Postmark as now, or
   Gmail as the staff member. About 2,000 a day per person
   ([limits](https://support.google.com/a/answer/166852)), 60 a minute
   ([quota](https://developers.google.com/workspace/gmail/api/reference/quota)).
   `email_sends` records the backend and sender, and gains the purposes
   `mailing` and `mailing-test`.
4. **Bounces and threads**, hourly. `users.history.list` since the last
   `historyId`
   ([docs](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list))
   gives new message IDs. The site fetches only those in our letters'
   threads, and bounces:
   - a bounce, from mailer-daemon or postmaster, goes to
     `recordProblem()` like a Postmark one. Remote bounces may not join
     the thread, so also search
     `from:mailer-daemon OR from:postmaster newer_than:3d`;
   - an auto-reply is logged as an event;
   - anything else is a message in the thread, kept raw and gzipped in
     Netlify Blobs, recorded in a new `letter_messages`.
5. **Backups.** The backup Worker pulls new blobs through a read-only
   route on the site.
6. **Staff pages.** Your account: Connect and Disconnect Gmail, saying
   what the site reads, and today's sends against the cap. Politicians:
   a "not mailed for this ask" filter. A politician's page: each letter
   opens its thread, with "Open in Gmail" for the sender. Politicians'
   blocked emails: bounces from Gmail marked.

### Data protection

`gmail.readonly` can read a whole mailbox; the site reads only new
message IDs and fetches only our threads and bounces. Tokens are
encrypted and deleted on disconnect. Replies are kept even when they
mention a constituent, and the policy says so. Google is a processor of
staff mail, as it is for the policy inbox.

## 2. Leave Airtable

Starts once two real mailings have gone from the site.

- Staff add politicians and edit what the sync owned, and a status
  change takes its real date and a note. Airtable keeps these in Notes;
  our audit log only knows when the sync saw them.
- Staff set any ask's status from a politician's page, not only those
  of `trackedAsks`. ControlAI's letter stays its import's.
- A politician's page shows only the asks put to them, with "Add an
  answer" for the rest.
- The syncs stop. Politicians keep their `airtable_id`.
- The check against Parliament (`lib/server/mp-check.ts`) covers the
  Lords, the Scottish Parliament and the Senedd, from their own APIs,
  reporting differences and changing nothing.

## Not in this plan

Custom sentences or PDFs per person; open tracking; follow-ups sent by
the site; recording what a reply said; mailings over Gmail's daily cap;
staff-defined fields; journalists; what politicians did in Parliament.

## Waiting on Joseph

The Google Cloud project.

## Open questions

1. **Who an ask was put to.** Needed before leaving Airtable. A list of
   houses isn't enough (Edinburgh went to the 129 MSPs and Scotland's 57
   MPs). Does an ask take its audience from its mailings' recipients,
   with one set by hand for asks with no mailing, or does the ask hold
   its audience and its mailings get checked against it?
2. **Adding asks in the site** rather than by migration: from when?
3. **Parliament's member IDs**: store them, so a re-elected member's
   records can be merged?
