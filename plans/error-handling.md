# Import errors nobody sees

Every import and scheduled job runs inside `keepingFailure`, so when a job fails
outright the failure is saved as a run and staff are emailed once. That works. What
goes missing is everything short of a whole failure: an error caught and passed over,
a run cut short by an outside service and saved as a success, an alert email that
never went.

The review that found these (5 November 2026) also found why they keep happening.
The code has no shared idea of a run that partly failed, so each job invents its own:
Luma writes `stoppedBy` into its result and an error into a column on the event, the
Emails sync lists `unplaced`, the Gmail read puts an `error` on each account, the old
letters import keeps `unreadable` and `unmatched` lists. `runStatus` in
`lib/import-runs.ts` has a special case for each of four jobs to turn those back into
a colour, and the alert emails know about only some of them. A new way of partly
failing has nowhere to go, so it goes nowhere.

So the plan has three parts: one shape for a problem, which every job and the page and
the emails share; lint checks that make new code use it; and the errors already found,
most of which the shape fixes and the rest fixed by hand.

## One shape for a problem

A problem is something that went wrong during a run without stopping it. It's recorded
on the run, shown on the job's page, and emailed about once.

- **`problem(what, error?)`** in `lib/server/problems.ts` is the one way to report an
  error that's been caught and carried past. It logs the error, with its `cause`, and if
  a run is in progress it adds the problem to the run. Outside a run, as in a form or a
  webhook, it only logs. `keepingFailure` opens the run with `AsyncLocalStorage`, so a
  helper deep inside a job, such as `gmailMessageId`, needs nothing passed to it. Check
  first that the store survives a Next.js route handler and a Netlify function; it
  should, as both run on Node.
- **`import_runs.problems`**, a JSON list, saved by `recordRun` from the store. One new
  migration; the pushed ones stay as they are.
- **Status, tint and folding come from it.** A run with problems is shown whole and
  amber, with its problems listed under its summary line, on every job. The four
  special cases in `runStatus` go. What's left of them is "more to do", which is amber
  too but not a problem: Luma stopping on its time, the old letters import not yet
  finished. Any new wording is a placeholder for a person to approve.
- **Emails come from it.** A run with problems, or a failed one, emails once, when the
  run before was clean; a run that's still failing stays quiet, as now. This replaces
  the separate emails in `recordFailure` and `alertUnreadable`. An alert email that
  can't itself be sent is logged, not recorded, so it can't loop.
- **The jobs use it.** Luma's per-event errors, the Gmail read's per-account error, the
  Emails sync's held-back emails, and the old letters import's refusal, unreadable
  messages and unmatched mail each become `problem()` calls. Their own counts and
  lists can stay where the page shows them; what changes is that the run knows.
- **`notifyStaff` reports its own failure** with `problem()`, including when
  `NOTIFICATION_INBOX` isn't set, so a caller needn't check its result.

## The lint checks

Each check is a test in `tests/checks/`, written the way `thin-pages.test.ts` is: it
parses the code and fails with a list of the places it objects to. Write them one at a
time, and before moving on, deal with everything the new one flags, taking the first
of these that fits:

1. The code really loses an error. Fix it, with a test.
2. The code is fine but could be written so the check doesn't flag it. Rewrite it.
3. Several flagged places are alike and all fine. The check is wrong: change or drop it.
4. The code is fine and there's nothing else like it. Add an exception, with its reason.

Exceptions are the last resort, and a check that needs more than two or three is
drawing the wrong line. List every one in the pull request. A check earns its place
if it catches errors that really get lost, can be explained in a sentence, and rarely
objects to good code; one that can't is dropped, with the reason in the pull request,
not loosened until it passes.

### 1. A caught error is rethrown or reported with `problem()`

In `lib/server`, `app/api` and `netlify/functions`. A `catch` block, or the function
passed to `.catch()`, must rethrow or call `problem()`. The check reads named
handlers, so `unlessGone` passes. Logging alone doesn't count: the error that started
this review was logged, and the log is where it was lost.

The review read all 45 `catch`es in scope. About twenty are fine as they are, mostly a
test for one expected error with the rest rethrown. Ten carry on after logging; those
become `problem()` under check 2. The real losses, which this check exists for, are:

- Luma's two per-event `catch`es, which save the error to a column nothing reads.
- `gmailMessageId` in `outside-services/gmail.ts`, which swallows everything, so a reply
  can fail to match its letter without a trace.
- `supporter-places.ts`, which sets `failed = true` and drops the error.
- Two in `erasure.ts`, which log that an erased supporter's mail couldn't be cleared and
  carry on. The person erasing is told "Erased". That's a data-protection gap and needs
  to reach them, not only the log.
- Six bare `catch`es that return a fallback and tell nobody: three in
  `outside-services/postcodes.ts`, one in `outside-services/stripe.ts`, two in
  `outside-services/luma-guests.ts`. A visitor sees "failed" or an empty list; nobody
  learns the service is down. `problem()` is the whole fix.

Three places are infrastructure and will be the exceptions: `flow-database.ts` (outside
a request there's no cookie), `warnIfBehind` in `db.ts` (development only), and the
helper that reads the body of an error response, which gathers the three
`res.json().catch(…)` calls into one place. `staffLink` is a fourth candidate; rewrite
it instead, so `siteUrl` can say it doesn't know without throwing.

Don't widen the check beyond those three directories. A form falling back to a default
after bad input isn't losing anything.

### 2. No `console.error`, `console.warn` or `String(error)` in those directories

Use `problem()`. `console.error` reaches only Netlify's logs, and `String(error)` drops
the error's `cause`, so a network failure is kept as "fetch failed" and nothing more.
The hits are mechanical: the ten logged `catch`es above, the four `String(error)`s, and
whatever else logs. `send` in `email.ts` is one of them; it then records a failed email
on the run whenever it's sending for a job.

### 3. Every cron route runs inside `keepingFailure`

In `app/api/cron/`. Without it there's no run to put a problem on, and a failure
reaches only Netlify's logs. `send-mailings` and `tidy-logs` fail this today. Sending
mail isn't an import, so decide whether it joins the import log, or gets a record of
its own that `problem()` can reach; either way the check then passes.

### 4. No floating promises

Turn on `@typescript-eslint/no-floating-promises`. Measured on 5 November: typed
linting takes the whole-repo lint from 12 to 20 seconds, and the rule flags eight
places, all fire-and-forget effects in client components, none in job code. Cheap
enough to do; it isn't about jobs, so it's last.

Two checks from the first draft are dropped. One required callers to use the result of
`send` and `notifyStaff`: every caller of `send` already does, and `notifyStaff` now
reports its own failure. The other required a reader for every `*_error` column: the
shape above shows Luma's errors on the run, which is what the column lacked.

## Errors to fix by hand

The shape and the checks cover most of the list from the review. These need their own
fix. Each came from reading the code, not from seeing it happen, so start with a
failing test.

- **A finished Gmail read can be recorded as a failed one.** `readAccount` in
  `gmail-reading.ts` saves how far it got, then asks Gmail for the account's name. When
  that was refused in production, the account showed as unread with every count at
  zero, though it had been read and won't be again, and the letters inbox's alert about
  mail it couldn't understand was never sent. A name that can't be fetched is a problem,
  not a failed read.
- **A batch of unmatched mail can go unreported.** `reportUnmatchedMail` in
  `one-off-emails.ts` marks the mail reported, then sends. Send first, then mark.
- **A second, different error during a failing stretch sends no email**, as
  `recordFailure` only asks whether the run before failed. Compare what went wrong,
  not only whether.
- **Records an import skipped are counted, not named**: `noPolitician` and `waiting` in
  the Emails sync, `noPolitician` in the web form import, `notFound` in the Go to
  Parliament import. Each is a number under a green "Done". Name them, as problems
  or in the result.
- **A message Gmail won't give is marked `skipped`**, the same as one that's gone or
  isn't ours (`handleOne` in `old-letters-import.ts`), so it can't be found again or
  retried. Give it an outcome of its own.
- **A message deleted mid-read fails the whole run.** In the old letters import,
  `gmailRawMessage` is called after the headers were read, without `unlessGone`, so
  staff get a failure email for a message the next run passes by.
- **The old letters import's reports go after seven days**, now that it's on the
  frequent schedule, and so do failed runs on every frequent and hourly job, all but
  the newest. Decide whether runs with problems, and failed ones, should be kept as
  long as a one-off job's are.
- **A malformed webhook or form body is treated as empty.** `app/api/postmark/inbound`
  and `app/api/march/register` read the body with `.catch(() => …)` and carry on with
  nothing. Postmark's case matters more: a reply it forwarded is dropped. Report it.

## Done when

`problem()` and the run store are in, every job records its problems through it, the
page shows them and the email comes from them; the checks that earned their place are
in `tests/checks/`, with any exceptions and their reasons; every error above is fixed
or the pull request says why not; the CI gate passes; `docs/code-structure.md` says how
an error is handled; and this plan is deleted.
