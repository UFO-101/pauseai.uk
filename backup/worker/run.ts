import type { DumpReport } from "../container/backup.ts";
import { problems, timestampColumns, type Manifest, type TableRule } from "./checks.ts";

// One backup: the container dumps the database and reports what the dump
// holds, the dump and its manifest go in the bucket, and the manifest is
// checked against the rules and the backup before.
//
// The bucket holds
//   dumps/<time>.dump          pg_dump's custom format: restore with pg_restore
//   manifests/<time>.json      the Manifest for each dump
//   latest.json                the newest Manifest, which the next run compares with

export const LATEST = "latest.json";

export interface Bucket {
  get(key: string): Promise<{ text(): Promise<string> } | null>;
  put(key: string, value: string): Promise<unknown>;
}

export interface BackupDeps {
  bucket: Bucket;
  /** Sends the container a request, as fetch does, with a path in place of a URL. */
  container(path: string, init?: RequestInit): Promise<Response>;
  /** Stores the dump in the bucket, checking it's the size and hash the container reported. */
  upload(key: string, body: ReadableStream, report: DumpReport): Promise<void>;
  rules: Record<string, TableRule>;
  now: Date;
}

export interface Outcome {
  /** Missing if the backup failed before it was stored. */
  manifest?: Manifest;
  /** What went wrong, one line each. Empty for a good backup. */
  problems: string[];
}

export async function takeBackup({ bucket, container, upload, rules, now }: BackupDeps): Promise<Outcome> {
  try {
    const latest = await bucket.get(LATEST);
    const previous = latest ? (JSON.parse(await latest.text()) as Manifest) : undefined;

    const response = await container("/backup", {
      method: "POST",
      body: JSON.stringify({ timestamps: timestampColumns(rules) }),
    });
    if (!response.ok) throw new Error(`The container couldn't back up the database. ${await response.text()}`);
    const report = (await response.json()) as DumpReport;

    // 2026-10-19T03-00-00Z: sorts by time, and has no colons for tools that mind them.
    const time = now
      .toISOString()
      .replace(/\.\d+Z$/, "Z")
      .replaceAll(":", "-");
    const key = `dumps/${time}.dump`;
    const dump = await container("/dump");
    if (!dump.ok || !dump.body) throw new Error(`The container couldn't send the dump: ${dump.status}.`);
    await upload(key, dump.body, report);

    const manifest: Manifest = { at: now.toISOString(), key, ...report };
    const json = JSON.stringify(manifest, null, 2);
    await bucket.put(`manifests/${time}.json`, json);
    await bucket.put(LATEST, json);
    return { manifest, problems: problems(manifest, previous, rules) };
  } catch (error) {
    return { problems: [(error as Error).message] };
  }
}
