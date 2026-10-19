# Scripts

What each script here does. Run them from the repo root, through `npm run`
where there's an npm script. Each file's opening comment has the details.

## Database

| Script               | Run with                                                     | What it does                                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `db-reset.mjs`       | `npm run db:reset`                                           | Wipes and remakes the local database `NETLIFY_DB_URL` names, with every migration, and the test MPs if `TEST_MP_EMAIL` is set. Refuses a database on another machine.                        |
| `db-migrate.mjs`     | `npm run db:migrate`                                         | Applies the migrations the local database hasn't had yet. `--applied-up-to 0011` is for a database made before the `schema_migrations` table. Local only: Netlify applies migrations itself. |
| `db-schema.mjs`      | `npm run db:schema`                                          | Rewrites `netlify/database/schema.sql` by applying every migration to a throwaway database and dumping it with `pg_dump` 18. Run it with each new migration.                                 |
| `fresh-database.mjs` | `node scripts/fresh-database.mjs <name> [--test-mp <email>]` | Makes an empty database with the migrations applied and prints its URL. The other database scripts, the tests (`tests/database.ts`) and the Playwright builds use its functions.             |

`docs/development.md`, section 3, covers using them.

## Storyboard

| Script           | Run with                    | What it does                                                                                                                                        |
| ---------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storyboard.mjs` | `npm run storyboard`        | The storyboard review: runs the Playwright suite with screenshots on both viewports, for this branch and for main, and opens the page pairing them. |
| `serve-main.mjs` | started by `storyboard.mjs` | Builds and serves where this branch left origin/main (or `--ref`) on fixture data, from a git worktree in your temp folder, for the comparison.     |

`docs/testing.md`, "The storyboard", covers them.

## Content and data

| Script                           | Run with                                          | What it does                                                                                                                                                                                              |
| -------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generate-ai-sentiment-data.mjs` | `npm run data:ai-sentiment`                       | Turns the AI Sentiment 2026 CSVs in `data/` into the JSON beside them, which `/global-ai-sentiment-2026` shows. Run it after editing a CSV.                                                               |
| `detect-face-positions.mjs`      | `npm run data:story-image-detect-faces -- <file>` | Finds the face in a photo in `public/images/people/` and sets that person's `imageStyle` in `lib/content/people.ts`. `--dry-run` only prints it. Always name the file: without one, it resets everyone's. |

`docs/development.md`, section 5, covers the photos.

## Tests and types

`db-migrate.test.ts` and `fresh-database.test.ts` test the scripts beside
them, in the Vitest node project. The `.d.mts` files give the scripts'
functions types, for the TypeScript that imports them.
