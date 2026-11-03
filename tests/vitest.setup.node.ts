// Setup for the "node" Vitest project: fixture responses for outside
// services, and an error for any request without one.
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./fixtures/msw";
import { LETTERS_INBOX } from "./fixture-env.mjs";

// Unit tests choose their responses through MSW, and their clock with fake
// timers. A DATA_FIXTURES=1 or FIXTURE_NOW inherited from a Playwright build
// (which runs these tests first) would bypass that.
delete process.env.DATA_FIXTURES;
delete process.env.FIXTURE_NOW;
// Mail to the letters inbox goes straight into the fake's mailbox in this
// process (tests/fixtures/letters-inbox.ts), which every test has.
delete process.env.LETTERS_INBOX_DIR;
process.env.LETTERS_INBOX = LETTERS_INBOX;

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
