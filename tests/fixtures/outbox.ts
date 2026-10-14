// With DATA_FIXTURES=1, every email sent through Postmark is also written to
// a file in OUTBOX_DIR, so a Playwright test can read it: the letter, its
// attachments, a forwarded reply. Test-only plumbing: there's no route or
// table for it.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

let count = 0;

/** Saves an outgoing Postmark email, if there's an outbox. */
export function recordOutgoing(url: string, init?: RequestInit): void {
  const dir = process.env.OUTBOX_DIR;
  if (!dir || new URL(url).hostname !== "api.postmarkapp.com" || typeof init?.body !== "string") return;
  mkdirSync(dir, { recursive: true });
  // Sortable by when they were sent.
  writeFileSync(join(dir, `${Date.now()}-${String(++count).padStart(4, "0")}.json`), init.body);
}

/** Every email in the outbox, oldest first. */
export function readOutbox(dir: string): Record<string, unknown>[] {
  let files: string[];
  try {
    files = readdirSync(dir).filter((file) => file.endsWith(".json")).sort();
  } catch {
    return [];
  }
  return files.map((file) => JSON.parse(readFileSync(join(dir, file), "utf8")));
}
