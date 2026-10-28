// What this checkout's storyboard calls the things it makes on the Postgres
// server and in the temporary directory, which every checkout of the repo
// shares. Each name carries a hash of the checkout's path, so a worktree's
// run beside the main checkout's never drops the other's databases or reads
// its emails.
//
// Plain JavaScript, as the scripts import it with Node, and not
// tests/fixture-env.mjs, which the site's own code imports. From the repo
// root, where every script and test runs. (Not import.meta: Playwright's
// loader compiles to CommonJS.)
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FLOW_DATABASE_PREFIX } from "./fixture-env.mjs";

const CHECKOUT = createHash("sha256").update(process.cwd()).digest("hex").slice(0, 8);

/** Where the build under test writes its emails (tests/fixtures/outbox.ts). */
export const OUTBOX_DIR = process.env.OUTBOX_DIR ?? join(tmpdir(), `pauseai-storyboard-outbox-${CHECKOUT}`);
/** Where main's fixture build (scripts/serve-main.mjs) writes its emails. */
export const MAIN_OUTBOX_DIR = join(tmpdir(), `pauseai-storyboard-main-outbox-${CHECKOUT}`);
/** Main's checkout, kept between reviews (scripts/serve-main.mjs). */
export const MAIN_WORKTREE = join(tmpdir(), `pauseai-storyboard-main-${CHECKOUT}`);

/** This checkout's flows' databases (tests/storyboard/fixtures.ts): FLOW_DATABASE_PREFIX, which the build accepts, then the checkout. */
export const FLOW_DATABASES = `${FLOW_DATABASE_PREFIX}${CHECKOUT}_`;
/** The migrated template, with the test MPs, that each flow's database is copied from. Doesn't match the prefix: a cookie can't name it. */
export const TEMPLATE_DATABASE = `pauseai_storyboard_template_${CHECKOUT}`;
/** The build's own database, for requests with no cookie. */
export const SERVER_DATABASE = `pauseai_storyboard_${CHECKOUT}`;
/** Main's build's own database. */
export const MAIN_DATABASE = `pauseai_storyboard_main_${CHECKOUT}`;
