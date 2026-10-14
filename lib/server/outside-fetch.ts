import "server-only";
import { fixtureResponse } from "@/tests/fixtures/outside-services";
import { recordOutgoing } from "@/tests/fixtures/outbox";

/**
 * fetch() for calls to outside services (Luma, Airtable, postcodes.io, ...). With
 * DATA_FIXTURES=1 it answers from tests/fixtures instead, so a test build
 * renders the same data every time and works offline (docs/testing.md).
 * The calling code still parses the response, so it is exercised either way.
 * Emails sent through Postmark are also written to the test outbox
 * (tests/fixtures/outbox.ts), for Playwright to read.
 */
export async function outsideFetch(url: string, init?: RequestInit): Promise<Response> {
  if (process.env.DATA_FIXTURES === "1") {
    recordOutgoing(url, init);
    return fixtureResponse(url) ?? new Response("No fixture for this URL", { status: 404 });
  }
  return fetch(url, init);
}
