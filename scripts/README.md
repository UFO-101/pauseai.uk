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

| Script                | Run with                             | What it does                                                                                                                                                                               |
| --------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `storyboard.mjs`      | `npm run storyboard`                 | The storyboard review: runs the Playwright suite with screenshots on both viewports, for this branch and for main, and opens the page pairing them.                                        |
| `storyboard-main.mjs` | imported by `storyboard.mjs`         | Keeps main's frames between runs, under main's commit and a hash of the suite's shared files, so a run builds and runs main only for the flows it hasn't got.                              |
| `serve-fixture.mjs`   | Playwright's `webServer`, or by hand | Builds this checkout on fixture data, with a fresh database of its own, and serves it on port 3100. Start it yourself to keep one server up between runs (`docs/development.md`, "Tests"). |
| `serve-main.mjs`      | started by `storyboard.mjs`          | Builds and serves where this branch left origin/main (or `--ref`) on fixture data, from a git worktree in your temp folder, on port 3001, for the comparison.                              |

`docs/testing.md`, "The storyboard", covers them.

## Content and data

| Script                           | Run with                                          | What it does                                                                                                                                                                                              |
| -------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generate-ai-sentiment-data.mjs` | `npm run data:ai-sentiment`                       | Turns the AI Sentiment 2026 CSVs in `data/` into the JSON beside them, which `/global-ai-sentiment-2026` shows. Run it after editing a CSV.                                                               |
| `detect-face-positions.mjs`      | `npm run data:story-image-detect-faces -- <file>` | Finds the face in a photo in `public/images/people/` and sets that person's `imageStyle` in `lib/content/people.ts`. `--dry-run` only prints it. Always name the file: without one, it resets everyone's. |
| `march-preview.mjs`              | `npm run march:preview`                           | Remakes the march page's link preview, a picture of its hero, from the dev server. Run it after changing the march's date, time or route, or the hero.                                                    |

`docs/development.md`, section 5, covers the photos.

## Tests and types

`db-migrate.test.ts`, `fresh-database.test.ts` and `storyboard-main.test.ts`
test the scripts beside them, in the Vitest node project. The `.d.mts` files give the scripts'
functions types, for the TypeScript that imports them.
