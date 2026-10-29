import "server-only";
import { getStore } from "@netlify/blobs";
import { outsideFetch } from "./outside-fetch";

// The only file that uses Netlify Blobs: the replies to our letters, each
// message kept whole, gzipped. Netlify gives a deployed function its
// credentials in the environment. The client takes its fetch, so its
// requests go through outsideFetch, and a fixture build's are answered by
// tests/fixtures/outside-services.ts.

/** The store of the messages in our letters' threads. */
const LETTER_REPLIES = "letter-replies";

/** Where a fixture build's store is, which only the fixtures answer. */
export const FIXTURE_BLOBS_URL = "https://blobs.fixture.invalid";

function store() {
  const fixtures = process.env.DATA_FIXTURES === "1";
  return getStore({
    name: LETTER_REPLIES,
    // The client always asks with the URL as a string.
    fetch: (url, init) => outsideFetch(String(url), init),
    ...(fixtures && { siteID: "fixture", token: "fixture", edgeURL: FIXTURE_BLOBS_URL }),
  });
}

/** Keeps a message, gzipped, under `key`. */
export async function saveLetterReply(key: string, gzipped: Buffer): Promise<void> {
  await store().set(key, new Uint8Array(gzipped).buffer);
}

/** A message kept under `key`, gzipped; undefined if there's none. */
export async function letterReply(key: string): Promise<Buffer | undefined> {
  const data = await store().get(key, { type: "arrayBuffer" });
  return data ? Buffer.from(data) : undefined;
}
