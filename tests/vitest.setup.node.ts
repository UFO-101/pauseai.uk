// Setup for the "node" Vitest project: fixture responses for outside
// services, and an error for any request without one.
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./tests/fixtures/msw";

// Unit tests choose their responses through MSW, and their clock with fake
// timers. A DATA_FIXTURES=1 or FIXTURE_NOW inherited from a Playwright build
// (which runs these tests first) would bypass that.
delete process.env.DATA_FIXTURES;
delete process.env.FIXTURE_NOW;

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
