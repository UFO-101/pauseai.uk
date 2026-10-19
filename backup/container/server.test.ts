import type { AddressInfo } from "node:net";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { DumpReport } from "./backup.ts";
import { backupServer } from "./server.ts";
import { testDatabase } from "./test-database.ts";

let dir: string;
let db: Awaited<ReturnType<typeof testDatabase>>;
let base: string;
let close: () => Promise<void>;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "backup-server-test-"));
  db = await testDatabase("CREATE TABLE letters (created_at timestamptz); INSERT INTO letters VALUES (now());");
  const server = backupServer(db.url, join(dir, "backup.dump")).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
  close = () => new Promise((resolve) => server.close(() => resolve()));
});

afterAll(async () => {
  await close();
  await db.drop();
  await rm(dir, { recursive: true, force: true });
});

describe("backupServer", () => {
  it("says a dump isn't there before the first backup", async () => {
    const response = await fetch(`${base}/dump`);
    expect(response.status).toBe(500);
    expect(await response.text()).toMatch(/ENOENT/);
  });

  it("backs up on POST /backup, then serves the dump on GET /dump", async () => {
    const response = await fetch(`${base}/backup`, {
      method: "POST",
      body: JSON.stringify({ timestamps: { letters: "created_at" } }),
    });
    expect(response.status).toBe(200);
    const report = (await response.json()) as DumpReport;
    expect(report.tables.letters.rows).toBe(1);

    const dump = await fetch(`${base}/dump`);
    expect(dump.headers.get("content-length")).toBe(String(report.bytes));
    expect(Buffer.from(await dump.arrayBuffer())).toEqual(await readFile(join(dir, "backup.dump")));
  });

  it("replies 500 with why a backup failed", async () => {
    const response = await fetch(`${base}/backup`, { method: "POST", body: "not json" });
    expect(response.status).toBe(500);
    expect(await response.text()).toMatch(/JSON/);
  });

  it("replies 404 to anything else", async () => {
    expect((await fetch(`${base}/backup`)).status).toBe(404);
    expect((await fetch(`${base}/other`, { method: "POST" })).status).toBe(404);
  });
});
