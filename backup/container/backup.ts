import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// What the container does: dump the live database, prove the dump restores,
// and count what's in it. The counts come from the restored copy, not the
// live database, so they describe the backup itself.

export interface TableStats {
  rows: number;
  /** The latest value of the table's timestamp column, for tables that name one. */
  newest?: string | null;
}

export interface DumpReport {
  bytes: number;
  sha256: string;
  /** Every table in the public schema. */
  tables: Record<string, TableStats>;
}

/** Table name to its timestamp column, for the newest row in each. */
export type TimestampColumns = Record<string, string>;

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

/**
 * Runs a command, resolving with its standard output. A failure names the
 * command and gives its standard error, never its arguments, which can hold
 * the database's password.
 */
export function run(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk));
    child.on("error", (error) => reject(new Error(`${command}: ${error.message}`)));
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${command} exited with ${code}: ${stderr.trim()}`));
    });
  });
}

/** Dumps the database to dumpPath, restores it to a scratch server, and reports what it holds. */
export async function backUp(databaseUrl: string, dumpPath: string, timestamps: TimestampColumns): Promise<DumpReport> {
  for (const [table, column] of Object.entries(timestamps)) {
    if (!IDENTIFIER.test(table) || !IDENTIFIER.test(column))
      throw new Error(`Not a plain identifier: ${table}.${column}`);
  }
  // The netlify schema is Netlify's record of the migrations it has applied,
  // which the read-only user can't read. The site's data is all in public.
  await run("pg_dump", [
    "--format=custom",
    "--exclude-schema=netlify",
    `--file=${dumpPath}`,
    `--dbname=${databaseUrl}`,
  ]);
  // Reads the dump's table of contents: a truncated or corrupt file fails here.
  await run("pg_restore", ["--list", dumpPath]);
  const tables = await restoreAndCount(dumpPath, timestamps);
  return { bytes: (await stat(dumpPath)).size, sha256: await sha256(dumpPath), tables };
}

async function sha256(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

/** Restores the dump into a Postgres of its own, on a socket in a scratch folder, and counts each table. */
async function restoreAndCount(dumpPath: string, timestamps: TimestampColumns): Promise<Record<string, TableStats>> {
  const dir = await mkdtemp(join(tmpdir(), "restore-"));
  const data = join(dir, "data");
  try {
    await run("initdb", ["--pgdata", data, "--auth=trust", "--username=postgres", "--no-sync"]);
    await run("pg_ctl", [
      "--pgdata",
      data,
      "--wait",
      `--log=${join(dir, "server.log")}`,
      `--options=-c listen_addresses='' -k ${dir}`,
      "start",
    ]);
    try {
      const url = `postgresql://postgres@/postgres?host=${dir}`;
      // Owners and grants name the live database's roles, which don't exist here.
      await run("pg_restore", ["--exit-on-error", "--no-owner", "--no-privileges", `--dbname=${url}`, dumpPath]);
      return await countRows(url, timestamps);
    } finally {
      await run("pg_ctl", ["--pgdata", data, "--wait", "--mode=immediate", "stop"]);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function countRows(url: string, timestamps: TimestampColumns): Promise<Record<string, TableStats>> {
  // query_to_xml runs a query built from each table's name, so one statement
  // counts every table, whatever tables there are.
  const counts = await run("psql", [
    url,
    "--no-psqlrc",
    "--tuples-only",
    "--no-align",
    "--command",
    `SELECT coalesce(json_object_agg(c.relname, (xpath('/row/n/text()',
       query_to_xml(format('SELECT count(*) AS n FROM public.%I', c.relname), false, true, '')))[1]::text::bigint), '{}')
     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')`,
  ]);
  const tables: Record<string, TableStats> = {};
  for (const [table, rows] of Object.entries(JSON.parse(counts) as Record<string, number>)) tables[table] = { rows };
  for (const [table, column] of Object.entries(timestamps)) {
    if (!tables[table]) continue;
    const newest = await run("psql", [
      url,
      "--no-psqlrc",
      "--tuples-only",
      "--no-align",
      "--command",
      `SELECT coalesce(to_json(max(${column}))::text, 'null') FROM public.${table}`,
    ]);
    tables[table].newest = JSON.parse(newest) as string | null;
  }
  return tables;
}
