# Permissions update

1. **Everyone at pauseai.uk gets an account** the first time they log in,
   with no permissions. Joseph asked for this.
2. **Supporter data needs `supporters`**, wherever it shows.
3. **The accounts table shows more**, and anyone can end sessions.

Change 1 is why change 2 is needed: today an admin chooses who gets an
account, so even one with no permissions is someone trusted. After change
1 it means only a pauseai.uk mailbox. All three go in one pull request, a
commit or more each.

## The rule

| Data                                                                                           | Who sees it  |
| ---------------------------------------------------------------------------------------------- | ------------ |
| Politicians and campaigns: names, roles, statuses, letter counts and politicians' addresses    | Any account  |
| Supporters: a member of the public's name, email, postcode, letters, lists, events and history | `supporters` |
| Staff and the system: accounts, sessions and Changes (the audit log)                           | `admin`      |

Who wrote to which MP is supporter data. A permission opens or closes
whole pages, with one exception: an MP's page.

`admin` doesn't include `supporters`, so an admin needn't have supporter
search to hand. They can tick it for themselves. Changes still shows
admins supporters' emails in some entries: accepted, since an admin is
trusted with more and the log isn't a way to look someone up.

## The sidebar, after this

| Section     | Page                                    | Needs        | Change                                     |
| ----------- | --------------------------------------- | ------------ | ------------------------------------------ |
|             | Home                                    | An account   | Was a login; the no-account page goes      |
| Supporters  | Supporters, a supporter, erasing them   | `supporters` |                                            |
|             | Letters, a letter, a supporter's letters | `supporters` | Was any account, in Politicians           |
|             | Blocked supporter emails                | `supporters` | New: half of Blocked emails                |
| Politicians | Politicians                             | An account   |                                            |
|             | An MP's page                            | An account   | Letters without senders, without `supporters` |
|             | Blocked MP emails                       | An account   | New: half of Blocked emails                |
| Admin       | Import, each job                        | An account   | Moved from Data, which goes                |
|             | Accounts                                | `admin`      | More columns (section 3)                   |
|             | Changes                                 | `admin`      |                                            |

Logging in needs nothing; logging out, a session.

Since Import stays open in the admin section, the permission moves from
each section to each page in `lib/staff-sections.ts`. A section shows the
pages you can open, and hides when there are none.

## 1. An account for everyone at pauseai.uk

- **Made on first login.** When a login link is used
  (`app/(staff)/staff/api/callback/route.ts`) by an address with no
  account, one is added with no permissions and `added_by` `'login'`,
  logged as "add staff account". The Add form stays, to give permissions
  before a first login.
- **The no-account page goes**, and the "login" level of `requireStaff`
  with it.
- **Remove ends the account's sessions**, which could otherwise outlive
  the mailbox: a kept session lasts 30 days, renewed on use.

Anyone at pauseai.uk can be staff, paid or volunteer. A leaver's Google
account is suspended or deleted, so no login link reaches them: the
mailbox decides who can log in. Logging in again after Remove makes a new
account with no permissions. To limit someone who's staying, take away
their permissions.

This relies on a suspended or deleted Google account not receiving mail
(I believe so, but haven't checked Google's documentation), and on a
leaver's mail not being forwarded or aliased to someone else, who could
then log in as them.

## 2. Supporter data only with `supporters`

- **Letters** moves into the Supporters section. Links into it from pages
  open to any account (an MP's history, Blocked MP emails' history, the
  dashboard's letters tiles) show only with `supporters`.
- **Blocked emails splits into two pages.** Only the pages split:
  blocking stays one system, with one table of blocks and one of
  bounces. Each page is a few lines, using the same components
  (`EmailBlocksTable`, `EmailProblemsTable`, the filter, `UnblockForm`),
  and `listBlocks` and `recentProblems` take a scope: a politician's
  address, or any other (staff ones included). So a bounce whose email
  isn't known still shows somewhere, and an address no longer a
  politician's falls on the supporter side. `unblockAddress` checks the
  same: unblocking anything but a politician's address needs
  `supporters`.
- **An MP's page**, without `supporters`, lists letters from a function
  that doesn't select the sender: date, campaign, status and reply, with
  no links. Left out in the query, so senders never reach the browser.
- **Imports** stay open to any account. Some change supporter data, but
  running one shows nobody's details.

Two checks keep it that way:

- **The leak check.** A storyboard flow logs in with no permissions,
  visits every staff route it can (the dynamic ones with fixture IDs),
  and fails if any fixture supporter's name or email is in a response,
  the RSC payload included.
- **The sidebar and the pages agree.** `tests/checks/staff-auth.test.ts`
  also checks that each page's `requireStaff`, and its
  `generateMetadata`'s, asks for the permission `lib/staff-sections.ts`
  gives it.

## 3. The accounts table

- **Columns:** email, permissions, added (when, and by whom or "by
  login"), last login, last seen, sessions open, and the buttons.
- **Last login and last seen**, a migration adding them to
  `staff_accounts`, since sessions are deleted. `last_login_at` is set by
  `createSession`. `last_seen_at` is set in the query where `sessionEmail`
  renews the session, since a kept session can go months without a login.
- **Sessions open:** their `staff_sessions` not yet expired.
- **Log out everywhere**, an admin's button on each row with sessions
  open, logged as "end staff sessions". On your own row it warns you it
  logs you out too.
- **For yourself**, with no permission needed: a quiet line at the foot
  of the staff home, shown only with more than one session open, saying
  how many devices you're logged in on and linking to log out of all of
  them.

## Data protection

In `docs/data-protection.md`:

- **The staff row:** last login and last seen. Every pauseai.uk address
  that logs in gets an account, volunteers' included, and access ends
  when their Google account does.
- **Assessment, Risks:** disclosure through a staff account is met by
  `supporters` on every page with supporter data but Changes, and by the
  leak check. Fix "a week's sessions": a day, or 30 days renewed on use.

The privacy policy and erasure don't change.

## Commits

Each with its tests, storyboard frames, gallery examples and placeholder
copy, in one pull request: supporter data (section 2) with the new
sidebar and both checks, then accounts on first login (section 1), then
the accounts table (section 3).

## Decided against

- **Hiding senders field by field**, keeping Letters open: every query
  for letters, blocks and bounces would change, and every later page
  would have to remember.
- **No letters on an MP's page** without `supporters`: they'd lose which
  MPs were written to and which answered.
- **One Blocked emails page**, whole behind `supporters` (hiding why an
  MP's address fails) or filtered by permission (a second page that
  varies).
- **Imports behind `supporters` or `admin`**: running one shows nobody's
  details.
- **`admin` including `supporters`**: see "The rule".
- **Logging views of letters**: every visit to the list would log one.
- **A permission for making changes**: anyone at pauseai.uk can edit MPs,
  run imports and decide held syncs, and Changes records who.
