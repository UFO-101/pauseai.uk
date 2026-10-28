# Email to politicians

Mailings to politicians sent by Gmail, with each thread readable in
`/staff`. Builds on `plans/mailings.md`. One pull request.

Waiting on Joseph: the Google Cloud project, and whose Gmail (below).

## Rules

- **From a person, not bulk.** Like one letter with a big BCC: no
  unsubscribe link and no consent check. Blocks and being in office are
  checked at send time.
- **PauseAI's letters and politicians' replies are kept in full**, as
  public figures in their public role. Supporters' letters and their
  replies aren't.

## Steps

1. **Try Gmail by hand.** Send from a test account to a domain that
   doesn't exist, a mailbox that doesn't exist and an auto-replier, and
   keep what comes back, anonymised, as fixtures. Check that
   `https://mail.google.com/mail/u/{sender}/#all/{threadId}` opens a
   thread; it isn't documented.
2. **Connect Gmail.** A Google Cloud project with an Internal consent
   screen, so only pauseai.uk accounts can grant it and Google needn't
   verify it ([user type](https://support.google.com/cloud/answer/15549945)).
   Scopes `gmail.send` and `gmail.readonly`
   ([scopes](https://developers.google.com/workspace/gmail/api/auth/scopes)).
   `staff_accounts` keeps the refresh token, encrypted, and the last
   `historyId` read.
3. **The Gmail channel.** `send()` takes a backend, Postmark or Gmail.
   Gmail allows about 2,000 a day per account
   ([limits](https://support.google.com/a/answer/166852)) and 60 a
   minute ([quota](https://developers.google.com/workspace/gmail/api/reference/quota)).
   `email_sends` records the backend and sender, and gains the purposes
   `mailing` and `mailing-test`.
4. **Bounces and threads**, hourly, from `users.history.list` since the
   last `historyId`
   ([docs](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list)).
   Only messages in our letters' threads, and bounces, are fetched:
   - a bounce from mailer-daemon or postmaster goes to `recordProblem()`
     like a Postmark one. Remote bounces may not join the thread, so
     also search `from:mailer-daemon OR from:postmaster newer_than:3d`;
   - an auto-reply is logged as an event;
   - anything else is kept raw, gzipped in Netlify Blobs, and recorded
     in a new `letter_messages`.
5. **Backups.** The backup Worker pulls new blobs through a read-only
   route.
6. **Adding asks**, on `/staff/asks` or from a new mailing: title, kind,
   and optionally date, link and who asks it. The slug comes from the
   title and date and is fixed once saved. Kind can't change once there
   are statuses, and an ask can be deleted only while nothing points at
   it. The asks named in `lib/asks.ts` can't be edited. New statuses
   stay migrations.
7. **Rename `REPLIES_INBOX`** to a name for politicians' mail, which is
   all it gets: copies of supporters' letters, MPs' replies and bounce
   alerts.
8. **Staff pages.**
   - Your account: connect and disconnect Gmail, saying what the site
     reads, and today's sends against the cap.
   - Politicians: a "not mailed for this ask" filter.
   - A politician's page: each letter opens its thread, with "Open in
     Gmail" for the sender.
   - Politicians' blocked emails: bounces from Gmail marked.

## Data protection

`gmail.readonly` could read a whole mailbox; the site reads only new
message IDs and fetches only our threads and bounces. Tokens are
encrypted and deleted on disconnect. Replies are kept even when they
mention a constituent, and the privacy policy says so. Google processes
staff mail, as it does for the policy inbox.

## Not in this plan

Custom sentences or PDFs per person; open tracking; follow-ups; recording
what a reply said; mailings over Gmail's daily cap; journalists; what
politicians did in Parliament.

## Open questions

1. **Whose Gmail**: each staff member's own, or one shared account for
   all mailings? Shared keeps threads together when people change;
   personal reads as from a person. The same goes for supporters'
   mailings by Gmail.
