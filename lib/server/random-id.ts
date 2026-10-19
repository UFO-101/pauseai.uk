import "server-only";
import { createHash, randomBytes } from "node:crypto";

/**
 * `bytes` random bytes (at most 32), for a token or an address that goes out
 * in an email. In a fixture build (DATA_FIXTURES=1) they're a hash of
 * `fixtureSeed()` instead, so the storyboard's pictures of the emails are the
 * same on every run, as the seeded shuffle keeps the home page's hero
 * (lib/shuffle.ts). The seed must differ for each value a flow needs, as the
 * value must; it's only worked out in a fixture build.
 */
export async function randomId(bytes: number, fixtureSeed: () => string | Promise<string>): Promise<Buffer> {
  if (process.env.DATA_FIXTURES !== "1") return randomBytes(bytes);
  return createHash("sha256")
    .update(await fixtureSeed())
    .digest()
    .subarray(0, bytes);
}
