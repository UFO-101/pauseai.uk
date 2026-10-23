# Permissions update

Three changes to the staff interface:

1. **Everyone at pauseai.uk gets an account** the first time they log in,
   with no permissions. Joseph asked for this.
2. **Supporter data needs `supporters`** wherever it shows, not only in
   the Supporters section.
3. **The accounts table shows more**: when each account was added, last
   login, last seen, sessions open, and a way to end them.

Change 2 is built first. Today an admin chooses who gets an account, so an
account with no permissions is still someone they trusted. After change 1
it means only a pauseai.uk mailbox, so whatever such an account can see is
open to everyone on the domain.

## Pages by permission, after this

Every page needs at least an account. The one marked \* shows less to
staff without `supporters`.

| Permission         | Pages                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| Any account        | Home (`/staff`), Politicians and an MP's page\*, **Blocked MP emails (new)**, Import and each job's page |
| `supporters`       | Supporters, a supporter and erasing them; **Letters and a letter's page (moved here)**; a supporter's letters; **Blocked supporter emails (new)** |
| `admin`            | Accounts, Changes                                                                                       |
| A session          | Logging out                                                                                             |
| Nothing            | Logging in                                                                                              |

Today Letters and a letter's page need only an account, and the home
page only a login. Blocked emails, open to any account, splits into the
two new pages.

## Everything else that changes

1. **Accounts made on first login**, with no permissions (section 1).
2. **The no-account page goes**, and the "login" level of `requireStaff`
   with it.
3. **Remove ends the account's sessions.**
4. **Letters moves into the Supporters section** of the navigation and
   the dashboard.
5. **Links into Letters** from pages open to any account (an MP's
   history, Blocked MP emails' history, the dashboard's letters tiles)
   show only with `supporters`.
6. **An MP's page** lists letters without senders to staff without
   `supporters`.
7. **Blocked emails splits in two**: Blocked MP emails in the Politicians
   section, and Blocked supporter emails in the Supporters section.
8. **Import moves to the top of the admin section** in the sidebar, still
   open to any account. The Data section goes.
9. **The leak check**, a storyboard flow that fails the gate if supporter
   data reaches an account without `supporters`.
10. **A check that the sidebar and the pages agree** on each page's
    permission, in `tests/checks/staff-auth.test.ts`.
11. **The accounts table** shows added, last login, last seen and
    sessions open, with log out everywhere on each row (section 3).
12. **Log out everywhere for yourself**, a quiet line on the staff home.
13. **A migration** adding `last_login_at` and `last_seen_at` to
    `staff_accounts`.
14. **`docs/data-protection.md`** (below).

Nothing changes for `admin`: it doesn't include `supporters`, and
imports stay open to any account.

## How it works now

Every staff page, `generateMetadata`, Server Action and route handler
calls `requireStaff(needs)` first (`lib/server/staff-auth.ts`), where
`needs` is a login, an account (the default), `supporters` or `admin`.
Anyone without it is sent to `/staff`. A permission opens or closes whole
pages, and the navigation and dashboard hide what you can't open.

## The rule

| Data                                                                                           | Who sees it  |
| ---------------------------------------------------------------------------------------------- | ------------ |
| Politicians and campaigns: names, roles, statuses, letter counts and politicians' addresses    | Any account  |
| Supporters: a member of the public's name, email, postcode, letters, lists, events and history | `supporters` |
| Staff and the system: accounts, sessions and the audit log (Changes)                           | `admin`      |

Who wrote to which MP is supporter data, even on the MP's page.

`admin` doesn't include `supporters`: someone can manage accounts without
supporter search to hand, and tick `supporters` for themselves if they
need it. Changes still shows every admin the supporters' emails in some
entries. That gap is accepted: an admin is trusted with more, and the log
isn't a way to look someone up.

## 1. An account for everyone at pauseai.uk

When a login link is used (`app/(staff)/staff/api/callback/route.ts`) by
an address with no account, an account is added with no permissions,
`added_by` `'login'`, and logged as "add staff account" by `'login'`. The
Add form stays, to give someone permissions before their first login.
Everyone who logs in then has an account, so the "You don't have a staff
account yet" page and the "login" level of `requireStaff` go.

Anyone at pauseai.uk can be staff, paid or volunteer. When someone leaves,
their Google account is suspended or deleted, so no login link reaches
them. The mailbox decides who can log in, and removal only tidies up:

- **Remove** deletes the account and ends its sessions, which could
  otherwise outlive the mailbox (a kept session lasts 30 days, renewed on
  use).
- Logging in again makes a new account with no permissions, which needs a
  working mailbox.
- To limit someone who's staying, an admin takes away their permissions.

This relies on two things. A suspended or deleted Google account mustn't
receive mail, which I believe but haven't checked in Google's
documentation. And a leaver's mail mustn't be forwarded to someone else
or made an alias of another account: whoever gets it could log in as
them, with no permissions, but under the leaver's name in Changes.

## 2. Supporter data only with `supporters`

**Letters** moves into the Supporters section. Links into it from pages
open to any account (an MP's history, Blocked MP emails' history, the
dashboard's letters tiles) show only with `supporters`, as the dashboard's
supporters tiles do already.

**Blocked emails splits in two**, the same components on both
(`EmailBlocksTable`, `EmailProblemsTable`, the filter by kind of block
and `UnblockForm`), each given its share by `listBlocks` and
`recentProblems`, which take a scope and filter in the query:

- **Blocked MP emails**, in the Politicians section, open to any account:
  addresses that are a politician's, their bounces and complaints.
- **Blocked supporter emails**, in the Supporters section, needing
  `supporters`: every other address, staff addresses included (a
  bounced login link or alert is rare enough not to need its own place).

Both go by the address, not by what was sent, so a bounce whose email
isn't known still lands on one side. An address no longer in the
politicians table falls on the supporter side, which is the safe one.
`unblockAddress`, a public endpoint, checks the address too: unblocking
anything but a politician's needs `supporters`.

**An MP's page** is the one page that shows less without `supporters`.
Its history lists the letters to the MP from a function that doesn't
select the sender: the date, campaign, status and when the MP replied,
with no links. It's left out in the query, not in a component, so the
senders never reach the browser in the page's data. So anyone can see
which MPs were written to and which answered.

**Imports** stay open to any account. Some change supporter data (Luma,
members, the ControlAI letter), but running one shows nobody's details.
In the sidebar, Import becomes the first page of the admin section, and
the Data section goes. So the permission moves from each section to each
page in `lib/staff-sections.ts`: a section shows the pages you can open,
and hides if there are none. Staff without `admin` see an admin section
holding only Import.

**The leak check.** A storyboard flow logs in with no permissions, visits
every staff route it can, the dynamic ones with fixture IDs (an MP with
letters, a letter, a supporter), and fails if any fixture supporter's
name or email is in the response, the RSC payload included. Like
`tests/checks/staff-auth.test.ts` for `requireStaff`, it fails the gate
on any new page that shows supporter data to the wrong people.

**The sidebar and the pages agree.** `tests/checks/staff-auth.test.ts`
already fails if a staff page, route handler or Server Action doesn't
call `requireStaff` first. It also checks, for each page in
`lib/staff-sections.ts`, that the page's `requireStaff` and its
`generateMetadata`'s ask for the permission the sidebar gives it, no more
and no less. So the sidebar never shows a page that turns you away, and a
page can't quietly need less than the sidebar says.

A supporter's page logs "view supporter". The Letters pages don't, so
"who has seen my details?" can be answered only for a supporter's page.

What each can do after this:

| What                                                                         | Any account | `supporters` |
| ---------------------------------------------------------------------------- | :---------: | :----------: |
| The dashboard: counts and "Needs a person"                                   | ✓           |              |
| Politicians: list, search, mark signed, edit; an MP's letters without senders | ✓           |              |
| Blocked MP emails: MPs' addresses, their bounces, unblocking them            | ✓           |              |
| Run any import; apply or discard a held MP sync                              | ✓           |              |
| Who wrote each letter, on an MP's page                                       |             | ✓            |
| Letters: the list, search, a letter, a supporter's letters                   |             | ✓            |
| Blocked supporter emails: every other address, unblocking them               |             | ✓            |
| Supporters: list, search, a supporter, erasing them                          |             | ✓            |

## 3. The accounts table

Columns: email, permissions, added (when and by whom, "by login" for
accounts made on first login), last login, last seen, sessions open, and
the buttons.

- **Last login and last seen** are new columns on `staff_accounts`, since
  sessions are deleted when they expire or the account is removed.
  `last_login_at` is set by `createSession`: when they last proved they
  had the mailbox. `last_seen_at` is set on every request, in the query
  where `sessionEmail` renews the session: whether they still use the
  site, which a kept session can do for months without a login.
- **Sessions open:** how many of their `staff_sessions` haven't expired.
- **Log out everywhere:** an admin's button on each row with sessions
  open. It ends them at once, like Remove and each tick, logged as "end
  staff sessions". On your own row it warns you that it logs you out too.
- **For yourself**, with no permission needed (a lost laptop): a quiet,
  muted line at the foot of the staff home, shown only with more than one
  session open, saying how many devices you're logged in on and linking
  to log out of all of them. Three when you expected one is the warning.

## Data protection

`docs/data-protection.md`:

- **The staff row:** last login and last seen. Every pauseai.uk address
  that logs in gets an account, volunteers' included. Access ends when
  their Google account is suspended or deleted.
- **Assessment, Risks:** "Disclosure of political opinions through a
  staff account" is met by `supporters` on every page with supporter data
  but the admin-only Changes, and by the leak check. Fix "a week's
  sessions": a session lasts a day, or 30 days renewed on use.

This is staff data, so the privacy policy and erasure don't change.

## Stages

Each with its tests, storyboard frames, gallery examples and placeholder
copy.

1. **Supporter data and the leak check:** Letters behind `supporters` and
   the links into it, an MP's letters without senders, the two Blocked
   emails pages, the sidebar's sections (Import into admin, permissions
   per page) with the check that they agree with the pages, and the
   leak-check flow.
2. **Accounts on first login:** made in the callback, Remove ends
   sessions, the no-account page and "login" level go, and the docs.
3. **The accounts table:** the new columns and their migration, and log
   out everywhere, on each row and on the staff home.

## Decided against

- **Hiding senders field by field on every page**, keeping Letters open:
  every function that fetches letters, blocks and bounces would change,
  and every later page would have to remember it.
- **No letters on an MP's page** without `supporters`: they'd lose which
  MPs were written to and which answered.
- **Blocked emails wholly behind `supporters`**: staff without it couldn't
  see why an MP's address is failing.
- **One Blocked emails page with a filter by kind**, fixed for staff
  without `supporters`: a second page that varies by permission, where
  two pages each have one.
- **Supporter imports behind `supporters`**: running one shows nobody's
  details.
- **`admin` including `supporters`**: see "The rule".
- **Logging every viewing of letters**: every visit to the list would log
  one. Add it when someone needs to know who read their letter.
- **A permission for making changes**: anyone at pauseai.uk can edit MPs,
  run imports and decide held syncs, and Changes records who.
