import { randomUUID } from "node:crypto";
import { run } from "./backup.ts";

// A throwaway database on the Postgres the PG* variables or the local socket
// point to, as the site's tests use.

export async function testDatabase(setup: string): Promise<{ url: string; drop(): Promise<void> }> {
  const name = `backup_test_${randomUUID().slice(0, 8)}`;
  await run("createdb", [name]);
  const url = `postgresql:///${name}`;
  await run("psql", [url, "--no-psqlrc", "--quiet", "--set=ON_ERROR_STOP=1", "--command", setup]);
  return { url, drop: () => run("dropdb", ["--force", name]).then(() => undefined) };
}
