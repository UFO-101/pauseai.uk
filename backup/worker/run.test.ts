import { describe, expect, it, vi } from "vitest";
import type { DumpReport } from "../container/backup.ts";
import type { Manifest } from "./checks.ts";
import { LATEST, takeBackup, type BackupDeps } from "./run.ts";

const NOW = new Date("2026-10-19T03:00:00.123Z");
const REPORT: DumpReport = { bytes: 3, sha256: "abc", tables: { letters: { rows: 2, newest: null } } };

function fakeBucket(objects: Record<string, string> = {}) {
  return {
    objects,
    get: vi.fn(async (key: string) => (key in objects ? { text: async () => objects[key] } : null)),
    put: vi.fn(async (key: string, value: string) => {
      objects[key] = value;
    }),
  };
}

function deps(overrides: Partial<BackupDeps> = {}): BackupDeps & { uploads: [string, string, DumpReport][] } {
  const uploads: [string, string, DumpReport][] = [];
  return {
    bucket: fakeBucket(),
    container: async (path) => (path === "/backup" ? Response.json(REPORT) : new Response("DUMP")),
    upload: async (key, body, report) => {
      uploads.push([key, await new Response(body).text(), report]);
    },
    rules: { letters: { neverShrinks: true } },
    now: NOW,
    uploads,
    ...overrides,
  };
}

describe("takeBackup", () => {
  it("stores the dump and its manifest, and finds no problems in a good backup", async () => {
    const bucket = fakeBucket();
    const container = vi.fn(async (path: string) =>
      path === "/backup" ? Response.json(REPORT) : new Response("DUMP"),
    );
    const d = deps({ bucket, container, rules: { letters: { timestamp: "created_at" } } });
    const outcome = await takeBackup(d);

    expect(container).toHaveBeenCalledWith("/backup", {
      method: "POST",
      body: JSON.stringify({ timestamps: { letters: "created_at" } }),
    });
    expect(d.uploads).toEqual([["dumps/2026-10-19T03-00-00Z.dump", "DUMP", REPORT]]);
    const manifest = { at: "2026-10-19T03:00:00.123Z", key: "dumps/2026-10-19T03-00-00Z.dump", ...REPORT };
    expect(outcome).toEqual({ manifest, problems: [] });
    expect(JSON.parse(bucket.objects["manifests/2026-10-19T03-00-00Z.json"])).toEqual(manifest);
    expect(JSON.parse(bucket.objects[LATEST])).toEqual(manifest);
  });

  it("compares with the last backup", async () => {
    const previous: Manifest = {
      ...REPORT,
      at: "2026-10-18T03:00:00.000Z",
      key: "k",
      tables: { letters: { rows: 5 } },
    };
    const outcome = await takeBackup(deps({ bucket: fakeBucket({ [LATEST]: JSON.stringify(previous) }) }));
    expect(outcome.problems).toEqual(["letters: 2 rows, down from 5 in the backup of 2026-10-18T03:00:00.000Z."]);
  });

  it("reports a backup the container couldn't take", async () => {
    const bucket = fakeBucket();
    const outcome = await takeBackup(
      deps({ bucket, container: async () => new Response("pg_dump exited with 1: no", { status: 500 }) }),
    );
    expect(outcome).toEqual({ problems: ["The container couldn't back up the database. pg_dump exited with 1: no"] });
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it("reports a dump the container couldn't send", async () => {
    for (const dump of [new Response("gone", { status: 500 }), new Response(null)]) {
      const outcome = await takeBackup(
        deps({ container: async (path) => (path === "/backup" ? Response.json(REPORT) : dump) }),
      );
      expect(outcome.problems).toEqual([`The container couldn't send the dump: ${dump.status}.`]);
    }
  });

  it("reports a dump that couldn't be stored", async () => {
    const bucket = fakeBucket();
    const outcome = await takeBackup(
      deps({
        bucket,
        upload: async () => {
          throw new Error("R2 said no");
        },
      }),
    );
    expect(outcome).toEqual({ problems: ["R2 said no"] });
    expect(bucket.put).not.toHaveBeenCalled();
  });
});
