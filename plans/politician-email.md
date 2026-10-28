# Email to politicians

Mailings to politicians are sent by Gmail, and staff can read each
whole thread in `/staff`. This builds on `plans/mailings.md`, phases 1
and 2, and is one pull request. Once it's built, a mailing made on the
new mailing page can be scheduled.

Joseph needs to create the Google Cloud project, and to decide with
Francis about a shared account (see the open questions).

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
   `historyId` read. A staff member connects from their account page,
   or from "Sent from" on the new mailing page, which goes to Google
   once and comes back to the mailing.
3. Add a Gmail channel. `send()` takes a backend, either Postmark or
   Gmail. Gmail allows about 2,000 emails a day per account
   ([limits](https://support.google.com/a/answer/166852)) and 60 a
   minute
   ([quota](https://developers.google.com/workspace/gmail/api/reference/quota)).
   `email_sends` records the backend and sender, and gets two new
   purposes, `mailing` and `mailing-test`.
4. The `send-mailings` job. It runs hourly, during the database wake
   that the other jobs share, and sends any mailing that's due. A
   scheduled function has only 30 seconds, about 30 emails at Gmail's
   pace, so a due mailing would start a Netlify background function,
   which runs for up to 15 minutes and sends at the channel's own pace,
   marking each recipient as it goes. Credit-based plans, ours
   included, have background functions
   ([docs](https://docs.netlify.com/build/functions/background-functions/)),
   charged as compute at 10 credits a GB-hour
   ([billing](https://docs.netlify.com/build/functions/usage-and-billing/)).
5. Read bounces and threads hourly. `users.history.list`
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
6. Back up the stored messages. The backup Worker fetches new ones
   through a read-only route on the site.
7. Let staff add asks, on `/staff/asks` or while making a mailing. An
   ask needs a title and a kind, and can have a date, a link and who is
   asking. Its slug is made from the title and date and can't be
   changed after it is saved. Its kind can't be changed once anyone has
   a status for it, and it can only be deleted while nothing refers to
   it. The asks named in `lib/asks.ts` can't be edited. Adding a new
   status for a kind still needs a migration.
8. Rename `REPLIES_INBOX` to a name that says it is for politicians'
   mail. Everything sent there is about politicians: copies of
   supporters' letters, MPs' replies and bounce alerts.
9. Drop the views `supporter_letters` and `pauseai_letters`, in a new
   migration. Migration 0056 renamed those tables and kept the old names
   as views only for the site deployed before it, which has long since
   been replaced. Rename the tables' not-null constraints, which still
   carry the old names (`supporter_letters_id_not_null` and so on), in
   the same migration.
10. Staff pages:
   - On your account page, connect or disconnect Gmail. The page says
     what the site reads in your mailbox, that any staff member can
     then send mailings from it, and how many emails you have sent
     today against the limit. Connecting from "Sent from" says the
     same before going to Google.
   - On the new mailing page, "Sent from" lists the connected accounts
     with today's sends, and offers "Connect Gmail" for your own if it
     isn't yet (`plans/mailings.md`, phase 2).
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

1. Should there be a shared account as well as each person's own? It
   would be a new Google account, as the policy@ group has no mailbox.
