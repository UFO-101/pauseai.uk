import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { flowDatabase } from "./flow-database";
import { migrationsBehindMessage } from "./migrations-check";
import { describeError } from "./problems";
import { staffCopy } from "@/lib/content/staff-interface";

// The only file that connects to the database (an ESLint rule bans "pg"
// anywhere else). Netlify Database's Postgres, at NETLIFY_DB_URL. Queries are
// plain SQL with $1-style parameters: no ORM.

let pool: Pool | undefined;

// A fixture build (DATA_FIXTURES=1) also serves the storyboard, which gives
// each flow its own database and names it in a cookie: one small pool per
// database, closed once its connections have gone idle. Production never
// looks at the cookie.
const flowPools = new Map<string, Pool>();

async function getPool(): Promise<Pool> {
  const connectionString = process.env.NETLIFY_DB_URL;
  if (!connectionString) throw new Error("NETLIFY_DB_URL is not set");
  if (process.env.DATA_FIXTURES === "1") {
    const name = await flowDatabase();
    if (name) return flowPool(connectionString, name);
  }
  if (pool) return pool;
  // Serverless functions each hold their own pool, so keep it small.
  pool = new Pool({ connectionString: verifyFullUrl(connectionString), max: 3 });
  // A connection the server drops while idle comes here; without a listener
  // it would be an uncaught error. Only a warning, not a problem for a run,
  // as the pool opens another and the next query carries on.
  pool.on("error", (error) => console.warn(staffCopy.problems.logs.connectionDropped, describeError(error)));
  // The dev server says in its terminal when the database needs
  // npm run db:migrate, rather than a page failing on a missing table.
  // Netlify's own databases are migrated on deploy, so only in development.
  if (process.env.NODE_ENV === "development") void warnIfBehind(pool);
  return pool;
}

function flowPool(connectionString: string, name: string): Pool {
  const existing = flowPools.get(name);
  if (existing) return existing;
  const url = new URL(connectionString);
  url.pathname = `/${name}`;
  const flow = new Pool({ connectionString: verifyFullUrl(url.toString()), max: 2, idleTimeoutMillis: 1000 });
  // The flow's database is dropped when its test ends, which cuts off any
  // connection still idle: expected, so nothing to report.
  flow.on("error", () => {});
  // Closed when its last idle connection is dropped, so a run of hundreds of
  // flows doesn't leave hundreds of pools behind.
  flow.on("remove", () => {
    if (flow.totalCount === 0 && flowPools.get(name) === flow) {
      flowPools.delete(name);
      void flow.end();
    }
  });
  flowPools.set(name, flow);
  return flow;
}

/**
 * Netlify's URL says sslmode=require. pg 8 treats that as verify-full (and
 * warns, once per process, that pg 9 will weaken it to libpq's meaning: encrypt
 * but don't check the certificate). Saying verify-full keeps today's checks
 * across the upgrade and quiets the warning.
 */
export function verifyFullUrl(connectionString: string): string {
  return connectionString.replace(/([?&]sslmode=)(prefer|require|verify-ca)(?=&|$)/, "$1verify-full");
}

async function warnIfBehind(db: Queryable): Promise<void> {
  try {
    const message = await migrationsBehindMessage(db);
    if (message) console.warn(`\n⚠ ${message}\n`);
  } catch {
    // The database isn't reachable, or similar: the query that follows reports it.
  }
}

/** Something that runs a query: the pool, or a client inside a transaction. */
export type Queryable = { query: PoolClient["query"] };

/** Runs one query and returns its rows. */
export async function query<Row extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
  db?: Queryable,
): Promise<Row[]> {
  return (await (db ?? (await getPool())).query<Row>(text, values)).rows;
}

/** Runs `work` in a transaction, rolled back if it throws. */
export async function transaction<T>(work: (db: Queryable) => Promise<T>): Promise<T> {
  const client = await (await getPool()).connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Closes the pools, so tests can switch databases or exit. */
export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = undefined;
  const flows = [...flowPools.values()];
  flowPools.clear();
  await Promise.all(flows.map((flow) => flow.end()));
}
