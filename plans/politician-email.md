# Email to politicians

Mailings to politicians are sent by Gmail, and staff can read each
whole thread in `/staff`. This builds on `plans/mailings.md` and is one
pull request.

Joseph needs to create the Google Cloud project, and to decide with
Francis whose Gmail account the mailings come from (see the open
question).

## Rules

- A mailing to politicians is written as if from a person, not as bulk
  mail. It is like one letter sent with a large BCC. It has no
  unsubscribe link and doesn't check consent. Before each send, the
  site checks that the address isn't blocked and that the politician is
  still in office.
- We keep PauseAI's letters and politicians' replies in full, because
  they are public figures acting in their public role. We don't keep
  supporters' letters or the replies to them.

## Steps

1. Try Gmail by hand. From a test account, send to a domain that
   doesn't exist, a mailbox that doesn't exist and an address with an
   automatic reply. Save what comes back, with personal details
   removed, as test fixtures. Check that
   `https://mail.google.com/mail/u/{sender}/#all/{threadId}` opens a
   thread, as this URL isn't documented.
2. Connect Gmail. The Google Cloud project has an Internal consent
   screen, so only pauseai.uk accounts can grant access and Google
   doesn't need to review it
   ([user type](https://support.google.com/cloud/answer/15549945)). It
   asks for the `gmail.send` and `gmail.readonly` scopes
   ([scopes](https://developers.google.com/workspace/gmail/api/auth/scopes)).
   `staff_accounts` stores the refresh token, encrypted, and the last
   `historyId` read.
3. Add a Gmail channel. `send()` takes a backend, either Postmark or
   Gmail. Gmail allows about 2,000 emails a day per account
   ([limits](https://support.google.com/a/answer/166852)) and 60 a
   minute
   ([quota](https://developers.google.com/workspace/gmail/api/reference/quota)).
   `email_sends` records the backend and sender, and gets two new
   purposes, `mailing` and `mailing-test`.
4. Read bounces and threads hourly. `users.history.list`
   ([docs](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list))
   lists the messages that arrived since the last `historyId`. The site
   fetches only the ones in our letters' threads, and bounces:
   - A bounce from mailer-daemon or postmaster goes to
     `recordProblem()`, as Postmark bounces do. A bounce from another
     server may not be in the thread, so the site also searches for
     `from:mailer-daemon OR from:postmaster newer_than:3d`.
   - An automatic reply is logged as an event.
   - Any other message is stored in full, gzipped, in Netlify Blobs,
     with a row in a new `letter_replies` table. A row there is any later
     message in the thread: the politician's reply, or our answer.
5. Back up the stored messages. The backup Worker fetches new ones
   through a read-only route on the site.
6. Let staff add asks, on `/staff/asks` or while making a mailing. An
   ask needs a title and a kind, and can have a date, a link and who is
   asking. Its slug is made from the title and date and can't be
   changed after it is saved. Its kind can't be changed once anyone has
   a status for it, and it can only be deleted while nothing refers to
   it. The asks named in `lib/asks.ts` can't be edited. Adding a new
   status for a kind still needs a migration.
7. Rename `REPLIES_INBOX` to a name that says it is for politicians'
   mail. Everything sent there is about politicians: copies of
   supporters' letters, MPs' replies and bounce alerts.
8. Staff pages:
   - On your account page, connect or disconnect Gmail. The page says
     what the site reads in your mailbox and how many emails you have
     sent today against the limit.
   - On the politicians list, a filter for those not yet mailed about
     an ask.
   - On a politician's page, each letter opens its whole thread, with
     an "Open in Gmail" link for the person who sent it.
   - On Politicians' blocked emails, bounces found in Gmail are marked
     as such.

## Data protection

The `gmail.readonly` scope would let the site read a whole mailbox. The
site reads only the IDs of new messages, and fetches only the messages
in our threads and bounces. Tokens are encrypted and deleted when
someone disconnects. Replies are kept even if they mention a
constituent, and the privacy policy says so. Google processes staff
mail, as it already does for the policy inbox.

## Not in this plan

A custom sentence or PDF for each person, open tracking, follow-up
emails, recording what a reply said, mailings larger than Gmail's daily
limit, journalists, and what politicians did in Parliament.

## Open questions

1. Should mailings come from each staff member's own Gmail account, or
   from one shared account? A shared account keeps every thread in one
   place when staff change. A personal account reads as being from a
   person. The same choice applies to mailings to supporters sent by
   Gmail.
