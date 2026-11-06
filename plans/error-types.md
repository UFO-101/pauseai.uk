# Real error types across the whole site

A briefing for the agent doing this. It's high level on purpose: think hard about the design, and show
Francis it, with a few converted call sites, before converting the rest. Read `AGENTS.md` and
`docs/code-structure.md`, "Rules" first.

## The problem

Everywhere on the site, not only in the imports, what went wrong is carried around as an English sentence
or an untyped value. Code can't tell one failure from another except by comparing or parsing text. We want
a structure that makes this hard to do: actual error types passed around.

Examples, not a complete list:

- `problem(what: string, error?: unknown)` (`lib/server/problems.ts`) stores the finished sentence on the run,
  and `lib/server/import-runs.ts` compares sentences to decide whether a problem is new. So a rewording looks
  like a new problem.
- `problem()`'s second argument is sometimes a caught error, sometimes a list we built ourselves.
- `lib/server/email.ts:159` gets addresses by parsing a Postmark error's message.
- `luma-guests.ts` does `error as Error` and returns sentences as `reason`.
- `turnstile.ts`, `mp-letters.ts` and `/api/email-your-mp/lookup` return finished copy as data.
- `describeError()` flattens errors to text, which is stored in several columns.

## Structural aims

- **Failures are types.** Expected failures are discriminated unions with codes and typed values, so the
  compiler checks each is handled. Failures that callers tell apart are error classes with fields.
- **Words only at the edge.** Whatever a person reads looks up its words from a code at that point. Nothing
  stores, compares, parses or passes our sentences around.
- **`unknown` stops at the catch.** TypeScript forces it there. It becomes something typed at once, and no
  further.
- **What's stored is structured:** a code, its values, and an outside service's raw error text, if any.
- **It stays enforced**, by types first and by checks in `tests/checks/` where types can't reach.

Existing code to learn from: `QueueReason`, `ScheduleResult`, `MarchRegisterResult`, `GmailError`, and `EraseLeftover`
with `leftOver()` in `lib/server/erasure.ts`.

Don't type what nothing distinguishes, and let truly unexpected errors throw.

## Limits

- New wording is a placeholder (`AGENTS.md`). The problem strings in `lib/content/staff-interface.ts` have just been
  reviewed, so check with Francis before moving groups of them.
- Migrations `0078`–`0080` are pushed and can't be edited. Say how rows already stored in the old shape are handled.
- This may be too big for the `error-handling` PR. Ask Francis about branching, and propose small steps that each
  pass the gate in `AGENTS.md`.
