import "server-only";
import { fixtureResponse } from "@/tests/fixtures/outside-services";

/**
 * fetch() for calls to outside services (Luma, Airtable, postcodes.io, ...). With
 * DATA_FIXTURES=1 it answers from tests/fixtures instead, so a test build
 * renders the same data every time and works offline (docs/testing.md).
 * The calling code still parses the response, so it is exercised either way.
 */
export async function outsideFetch(url: string, init?: RequestInit): Promise<Response> {
  if (process.env.DATA_FIXTURES === "1") {
    return fixtureResponse(url) ?? new Response("No fixture for this URL", { status: 404 });
  }
  return fetch(url, init);
}
