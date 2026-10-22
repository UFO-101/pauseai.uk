# Permissions update

This plan makes three changes to who can use the staff interface and what
they can see there:

1. Anyone with a pauseai.uk address gets a staff account the first time
   they log in. The account starts with no permissions. Joseph asked for
   this.
2. A member of the public's details (supporter data) show only to staff
   who have the `supporters` permission. This applies on every page, not
   only in the Supporters section.
3. The staff accounts table shows more about each account: when it was
   added, when its owner last logged in, how many sessions they have open,
   and a button that logs them out of all of them.

Change 1 is the reason change 2 matters now. At the moment an admin
decides who gets an account, so even an account with no permissions
belongs to someone an admin trusted. Once anyone at pauseai.uk gets an
account just by logging in, having an account proves only that you have a
pauseai.uk mailbox. Any supporter data that an account with no
permissions can see would then be open to everyone on the domain.

## How permissions work now

- Every staff page, Server Action and route handler starts by calling
  `requireStaff(needs)` (`lib/server/staff-auth.ts`). `needs` is one of
  three levels:
  - **a login**: enough for the home page and for logging out;
  - **an account**: the default;
  - **a permission**: `supporters` or `admin`.

  Anyone without the level a page needs is sent back to `/staff`.
- The sections (`lib/staff-sections.ts`) need these levels:
  - **Supporters**: `supporters`;
  - **Politicians** and **Letters**: an account;
  - **Import** and **Blocked emails**: an account;
  - **Accounts** and **Changes**: `admin`.

  The navigation and the dashboard hide any section you can't open.
- So a permission opens or closes whole pages. Nothing on a page is
  hidden by permission.
- Anyone can ask for a login link for a pauseai.uk address and get a
  session with it. Someone who has a session but no account sees "You
  don't have a staff account yet" on the home page, and who to ask for
  one.

## The rule: each permission covers a kind of data

| Data                                                                                                | Who sees it  |
| --------------------------------------------------------------------------------------------------- | ------------ |
| Politicians and campaigns: names, roles, statuses, letter counts and politicians' addresses         | Any account  |
| Supporters: a member of the public's name, email, postcode, letters, lists, events and history      | `supporters` |
| Staff and the system: accounts, sessions and the raw audit log                                      | `admin`      |

A page that shows supporter data needs `supporters`, and a permission
still opens or closes whole pages. Who wrote to which MP counts as
supporter data, even on the MP's page.

## Where supporter data shows outside the Supporters section

| Where                                     | What it shows                                                                              | Who can see it now                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Letters (`/staff/letters`)                | Each sender's name and email, and whether they consented                                   | **Any account**                                                          |
| The letters search                        | Results matching a sender's name or email (`recentLetters`, `lib/server/letters.ts`)       | **Any account**. Searching for an address shows whether that person wrote |
| An MP's page, the letter history          | Each sender, linked to their page                                                          | **Any account**                                                          |
| Blocked emails, the blocked list          | Every blocked address, including a supporter's (for example, a forwarded reply that bounced) | **Any account**                                                        |
| Blocked emails, History                   | Every bounce and complaint, with the address and what was sent                             | **Any account**                                                          |
| Changes (`/staff/audit-log`)              | Supporters' emails, in the details of some entries                                         | `admin` only                                                             |

These show no supporter data: the import pages and the dashboard (counts
only), the alert email to staff (the MP and their address) and the
accounts page.

## 1. An account for everyone at pauseai.uk

When someone uses a login link (`app/(staff)/staff/api/callback/route.ts`)
and their address has no account, one is added for them with no
permissions. Its `added_by` is `'login'`, and the audit log records
"add staff account" by `'login'`. Everyone who logs in then has an
account, so the "You don't have a staff account yet" home page is no
longer needed.

Anyone at pauseai.uk can be staff, paid or volunteer. When someone
leaves, their Google account is suspended or deleted, so they can't get
another login link. That makes the mailbox what decides who can log in,
and removal here only has to tidy up:

- **Remove** deletes the account and ends all its sessions at once. A
  session left open would otherwise last up to 30 days, renewed on use,
  after the mailbox closed. Today `requireStaff` already turns away a
  session whose account has gone, since sessions are kept by email
  rather than by account.
- Logging in again makes a new account with no permissions. That's only
  possible while the mailbox still works, so it doesn't undo a leaver's
  removal.
- To limit someone who is staying, an admin takes away their
  permissions. They still see the pages that need only an account, which
  after stage 1 show no supporter data.

Two things this relies on:

- A suspended or deleted Google account doesn't receive mail. I believe
  that's so, but haven't checked it in Google's documentation.
- When someone leaves, their mail isn't forwarded to someone else, or
  their address added as an alias of another account. If it is, whoever
  gets their mail can log in as them. They'd get an account with no
  permissions, so no supporter data, but the audit log would show the
  leaver's address for what they did.

The Add form stays, so an admin can give someone permissions before they
first log in.

## 2. Supporter data only with `supporters`

Rather than hiding parts of pages, move the pages that show supporter
data behind `supporters`:

- **Letters** (`/staff/letters`, a letter's page and a supporter's
  letters) moves into the Supporters section and needs `supporters`. Its
  search goes with it.
- **Blocked emails** needs `supporters` too. It's in the Data section
  with the import pages, which stay open to any account. An MP's blocked
  address can still be unblocked by any account, from the alert on the
  MP's page.
- **An MP's page** is the one page that stays open to any account and
  shows letters. Its page component fetches the letters only for staff
  with `supporters`, and passes an empty list otherwise, so the history
  shows just the MP's own changes. It's one line, in a server component,
  so the senders never reach the browser. The letter counts in the
  politicians table stay, since they name nobody.

Staff without `supporters` lose the list of letters to each MP. They keep
the counts.

### `admin` includes `supporters`

An admin can give themselves `supporters` anyway, by ticking the box. So
`requireStaff("supporters")` would let an admin through, and the accounts
table would show the `supporters` box ticked, and greyed out, for every
admin. Then the audit log needs nothing hidden.

The alternative is to keep the two separate, and hide supporters' emails
in the audit log from an admin without `supporters`. That's more code to
stop something an admin can get round by ticking a box.

### A check that fails if supporter data leaks

A storyboard flow logs in with an account that has no permissions, opens
every staff page that account can reach, and fails if any fixture
supporter's name or email appears in the response. That includes the
data Next sends along with the page (the RSC payload), not just what's on
screen. It does for supporter data what `tests/checks/staff-auth.test.ts`
does for `requireStaff`: whoever writes a new page that shows supporter
data, the gate fails.

### Optional: log every viewing of supporter data

A supporter's page already logs "view supporter". The Letters page and an
MP's page don't log anything when they show senders. Logging them would be needed to answer "who has seen my
details?" in full. I'd leave it until someone asks for it, because it
would log a viewing every time anyone opens the Letters page.

## 3. More on the staff accounts table

The table's columns would be: email, permissions, added (the date and
who by), last login, sessions open, and the buttons.

- **Added:** `added_at` and `added_by` already exist. Accounts made on
  first login show "by login".
- **Last login:** the sessions can't tell us this, because expired
  sessions are deleted whenever a new one starts (`createSession`). Two
  ways to record it:
  - **A. `last_login_at` on `staff_accounts`, set by `createSession`**:
    the last time they started a new session. **Recommended.**
  - **B. `last_seen_at`, set on every page load.** `sessionEmail` already
    updates the session on every request, so this adds one column to that
    update. It's a better answer to "is this account still in use?".
    Sessions last 30 days and are renewed on use, so someone may not log
    in again for months while still using the site.

  We could show both. I'd start with A, and add B if it's wanted.
- **Sessions open:** the number of the account's `staff_sessions` that
  haven't expired.
- **Log out everywhere:** a button on each row with sessions open. It
  deletes them straight away, like Remove and each tick do. Only admins
  can use it, and it's logged as "end staff sessions". On your own row it
  logs you out too, and warns you first.
  Optionally, the staff home could have the same button for your own
  sessions, for a lost laptop, with no permission needed.

## Data protection

`docs/data-protection.md` needs these changes:

- **The staff row:** add last login (and last seen, if we choose B). Say
  that an account is now made for every pauseai.uk address that logs in,
  volunteers' included, and that access ends when someone's Google
  account is suspended or deleted.
- **Assessment, Risks:** the risk "Disclosure of political opinions
  through a staff account" is now met by requiring `supporters` on every
  page that shows supporter data, and by the leak check. The same section
  says sessions last "a week", which is already wrong: a session lasts a
  day, or 30 days renewed on use.

This is all data about staff, so the privacy policy and erasure don't
change.

## Stages

Each stage comes with its tests, storyboard frames, gallery examples and
placeholder copy.

1. **Supporter data only with `supporters`, and the leak check.**
   - Letters and Blocked emails need `supporters`, and Letters moves into
     the Supporters section.
   - An MP's page shows letters only to staff with `supporters`.
   - `admin` including `supporters`.
   - The leak-check flow.

   This comes first, because stage 2 opens the pages that need only an
   account to everyone at pauseai.uk.
2. **Accounts on first login.** Remove ends the account's sessions, and
   the home page and the docs change.
3. **The accounts table.**
   - The added, last login and sessions open columns.
   - Log out everywhere.
   - A migration adding `last_login_at`.

## Questions

1. Should an admin always have `supporters`?
2. Record last login (A), last seen (B), or both?
3. Should there be a "log out everywhere" button for your own sessions on
   the staff home?
4. Is there a bigger change to permissions to fit in at the same time,
   such as a new permission for letters or campaigns?
