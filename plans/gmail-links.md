# Testing the Gmail links by hand

On pauseai.uk, logged in as francis@pauseai.uk.

- **TODO-1: a letter sent from your own Gmail.** Mailings, then a mailing sent from francis@pauseai.uk, then any sent letter. Click "Open in Gmail" beside "Letter and replies". It should open that email's thread in francis@'s Gmail.
- **TODO-2: a letter sent from someone else's Gmail.** https://pauseai.uk/staff/mailings/9/letters/6413. Click "Find it in Gmail". It should show a Gmail search with that email in it. If it's empty, check which Google account it opened in.
- **TODO-3: a letter not sent yet.** A draft or scheduled mailing, then one of its letters. Click "Find it in Gmail". The search will probably be empty; it only has to not break.
- **TODO-4: a supporter's letter.** Supporters, then Letters to MPs, then one that isn't imported. Click "Find it in Google Groups". It should open that letter in the policy@ group.

## What testing found

- `mail.google.com/mail/u/<address>/` gives Gmail's 404, even for an account you're signed in to. `mail.google.com/mail/?authuser=<address>` works for one you're signed in to; for one you only reach by delegation, it opens your own account instead.
- TODO-1 uses `/u/<address>`, so it's probably broken.
- TODO-2 searches your own mailbox, so it finds nothing for a real MP; it only seemed to work because francis@ is the test MP.
- TODO-4 points at Google Groups, but supporters' letters are Bcc'd to `POLICY_INBOX`, policy@pauseai.uk, now a Gmail account.

## The plan

- TODO-1 and TODO-2: "Open in Gmail" for everyone, at `?authuser=<sending account>#all/<threadId>`, the link naming the account, as a delegate has to switch to it by hand.
- TODO-3: keep the search, or drop the link.
- TODO-4: a Gmail search of `POLICY_INBOX` for `rfc822msgid:<postmarkId>@mtasv.net`, with `authuser=<POLICY_INBOX>`.
