// Setup for the "node" Vitest project: fixture responses for outside
// services, and an error for any request without one.
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./tests/fixtures/msw";

// Unit tests choose their responses through MSW. A DATA_FIXTURES=1 inherited
// from a Playwright build (which runs these tests first) would bypass that.
delete process.env.DATA_FIXTURES;

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
