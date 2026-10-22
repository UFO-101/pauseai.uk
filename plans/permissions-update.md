# Permissions update

Three changes to who can use the staff interface and what they see:

1. Everyone with a pauseai.uk address gets a staff account, with no
   permissions, the first time they log in. Joseph wants this.
2. A member of the public's details (supporter data) show only to staff
   with the `supporters` permission, on every page, not only in the
   Supporters section.
3. The staff accounts table shows more about each account: when it was
   added, when they last logged in, how many sessions they have open, and a
   button to log them out of all of them.

Change 1 is why change 2 matters now. Today an admin chooses who gets an
account, so an account with no permissions is someone they trusted. Once
every pauseai.uk address gets one by logging in, "has an account" means
only "has a pauseai.uk mailbox". Any supporter data an account alone can
see would then be open to everyone on the domain.

## How permissions work today

- Every staff page, Server Action and route handler calls
  `requireStaff(needs)` first (`lib/server/staff-auth.ts`). `needs` is one
  of three:
  - a login: the home page and logging out;
  - an account: the default;
  - a permission: `supporters` or `admin`.

  If you don't have what's needed, you're sent to `/staff`.
- The sections (`lib/staff-sections.ts`) are:
  - **Supporters** (`supporters`);
  - **Politicians** and **Letters** (an account);
  - **Import** and **Blocked emails** (an account);
  - **Accounts** and **Changes** (`admin`).

  The navigation and the dashboard hide the sections you can't open.
- So a permission switches off whole pages. Two parts of pages are the
  exception: the Letters page and an MP's letter history. They hide
  senders unless you have `supporters` (`showSenders`, on this branch).
- Anyone can ask for a login link for a pauseai.uk address, and gets a
  session. Without an account the home page says "You don't have a staff
  account yet" and whom to ask.

## The rule: permissions are about kinds of data

| Data                                                                                               | Who sees it                    |
| -------------------------------------------------------------------------------------------------- | ------------------------------ |
| Politicians and campaigns: names, roles, statuses, letter counts, politicians' addresses           | Any account                    |
| Supporters: a member of the public's name, email, postcode, letters, lists, events and history     | `supporters`                   |
| Staff and the system: accounts, sessions, the raw audit log                                        | `admin`                        |

A page is open to the kind of data it is mostly about. Any supporter data
on a page open to more people is redacted for those without `supporters`.
"Who wrote to which MP" is supporter data, even on an MP's page.

## Where supporter data shows outside the Supporters section

| Where                                                    | What                                                                  | Today                            |
| -------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------- |
| Letters (`/staff/letters`)                               | Each sender's name, email and consent                                 | Hidden without `supporters` (this branch) |
| Letters search                                           | Matches sender name and email (`recentLetters`, `lib/server/letters.ts`) | **Open**: searching for an address reveals whether that person wrote |
| An MP's page, the letter history                         | Each sender, linked to their page                                     | Hidden without `supporters` (this branch) |
| Blocked emails, the blocked list                         | Every blocked address, a supporter's too (a forwarded reply that bounced) | **Open** to any account     |
| Blocked emails, History                                  | Every bounce and complaint, the address and what was sent             | **Open** to any account          |
| Changes (`/staff/audit-log`)                             | Supporter emails in some entries' details                             | `admin` only                     |

These don't show supporter data: the import pages (counts only), the
dashboard (counts only), the staff alert email (the MP and their address)
and the accounts page.

## 1. An account for everyone at pauseai.uk

When a login link is redeemed (`app/(staff)/staff/api/callback/route.ts`)
for an address with no account, add one with no permissions. `added_by` is
`'login'`, and the audit log records it as "add staff account" by
`'login'`. Having no account then happens only to someone an admin turned
away. The "You don't have a staff account yet" home page stays for them.

The catch is removing someone. Today an admin removes an account by
deleting its row. With accounts made on login, the next login would make
it again. Options:

- **A. Removed accounts are kept, marked removed** (a `removed_at`
  column). Logging in doesn't bring a removed account back, and
  `requireStaff` treats one as no account. Removing someone also ends
  their sessions. An admin can add them back. **Recommended**: removal
  still means something.
- **B. No removing, only taking away permissions.** Anyone with a
  pauseai.uk mailbox can see the account-level pages. Losing the mailbox
  (when someone leaves, in Google Workspace) is what ends access.
  Simplest, but then nothing here can shut out someone who still has their
  mailbox.
- **C. Make accounts on login only for addresses never seen before**,
  remembering every address that has had one. This is A without the
  column showing on the table. Harder to explain.

Either way, the Add form stays, so an admin can give permissions before
someone's first login.

## 2. Supporter data only with `supporters`

### Redact on the server

The functions that fetch letters, an MP's letter history, blocks and
email problems would take the viewer's permissions, and return a sender
or address as either the details or `null`. They'd be typed so a page
can't show what it wasn't given. Today `showSenders` is safe only because
`LettersTable` and `PoliticianDetails` are server components. Given to a
client component, the hidden emails would still go to the browser in the
page's data.

- **Letters search:** without `supporters`, the search matches only the
  MP's name and the subject, not the sender.
- **Blocked emails:** an address that isn't a politician's shows as "a
  supporter's address", with what was sent and why it was blocked.
  Unblocking it needs `supporters`, since the form names the address. An
  MP's blocked address stays open to everyone, so anyone can unblock an
  MP who has fixed their address in Airtable.

### One component for a supporter

`Supporter`: their name linked to their page, or, without the
permission, a plain "a supporter" (copy needed). Used wherever a sender
shows. It replaces the `showSenders` prop on `LettersTable` and
`PoliticianDetails`.

### Letters: hide part of the page, or all of it?

- **A. Hide the senders, keep the page open to everyone** (this branch,
  done on the server as above). Anyone can see what's been sent to whom,
  and which MPs answered. **Recommended.**
- **B. Put the whole Letters page under `supporters`.** Simpler, and it
  fits "a permission switches off pages". But staff without it lose
  the list of letters to each MP, and the MP's page would still need A
  for its history.

### `admin` includes `supporters`

An admin can tick `supporters` for themselves anyway. So
`requireStaff("supporters")` passes for an admin, and the accounts table
shows the `supporters` box ticked and disabled for an admin. Then the audit
log needs no redaction.

The other way is to keep them separate and redact supporter emails in the
audit log for an admin without `supporters`. That's more code, for a line
an admin can cross by ticking a box.

### A check that fails when supporter data leaks

A storyboard flow logs in with an account with no permissions, opens
every staff page that account can open, and fails if any fixture
supporter's name or email appears in the response. That includes the data
Next sends with the page (the RSC payload), not only what's shown. It
plays the part `tests/checks/staff-auth.test.ts` plays for
`requireStaff`: a new page that shows supporter data fails the gate,
whoever writes it.

### Optional: log each viewing of supporter data

A supporter's page logs "view supporter". The Letters page and an MP's
page, showing senders to someone with `supporters`, don't. That's needed
to answer "who has seen my details" fully. I'd leave it until it's asked
for: it would log a viewing at every visit to the Letters page.

## 3. More on the staff accounts table

The table's columns would be: email, permissions, added (date and by
whom), last login, sessions open, and the buttons.

- **Added:** `added_at` and `added_by` exist already. "By login" for
  accounts made on first login.
- **Last login:** expired sessions are deleted when a new one starts
  (`createSession`), so they can't tell it. Options:
  - **A. `last_login_at` on `staff_accounts`, set by `createSession`.**
    When they last got a new session. **Recommended.**
  - **B. `last_seen_at`, set on every page load.** `sessionEmail` already
    updates the session on every request, so this is one more column in
    that update. It's more useful for "is this account still used?" with
    30-day sessions renewed on use, where someone may not log in again for
    months.

  Both could be shown. I'd start with A and add B if wanted.
- **Sessions open:** a count of `staff_sessions` not yet expired.
- **Log out everywhere:** a button on each row that has sessions. It
  deletes them, admin only, and is logged as "end staff sessions". It's
  its own form, like Remove, so it works while permission changes are
  unsaved. On your own row it logs you out too, and says so first.
  Optionally the same button for yourself on the staff home, for a lost
  laptop, needing no permission.

## Data protection

`docs/data-protection.md` needs:

- **Staff row:** add last login (and last seen, if B). Accounts are now
  made for every pauseai.uk address that logs in. Accounts are kept after
  removal (if option A).
- **Assessment, Risks:** "Disclosure of political opinions through a
  staff account" is met by the `supporters` permission on every page that
  shows supporter data, and by the leak check. It also says "a week's
  sessions", which is wrong today: sessions are a day, or 30 days renewed
  on use.

This is staff data, so the privacy policy and erasure are unchanged.

## Stages

Each stage gets its tests, frames, gallery examples and copy placeholders.

1. **Supporter data on the server, and the leak check.**
   - Redaction in `recentLetters`, the MP history, `listBlocks` and
     `recentProblems`.
   - The `Supporter` component, replacing `showSenders`.
   - The letters search and blocked emails changes.
   - `admin` includes `supporters`.
   - The leak-check flow.

   First, because stage 2 opens the account-level pages to everyone.
2. **Accounts on first login.** Removal per option A, B or C, a migration
   if A, and the home page and docs.
3. **The accounts table.**
   - Added, last login and sessions open.
   - Log out everywhere.
   - A migration for `last_login_at`.

## Questions

1. Who has pauseai.uk addresses: only staff, or volunteers too? And does
   someone's mailbox close when they leave? That decides between options A
   and B for removal.
2. Letters: hide the senders (A) or the whole page (B)?
3. Should an admin always have `supporters`?
4. Last login (A), last seen (B), or both?
5. Log out everywhere for yourself too, on the staff home?
6. Is this the "broader related change" for the parked `showSenders`
   todo, or is there something else (a new permission, say, for letters or
   campaigns)?
