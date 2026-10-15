import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

// The only file that connects to the database (an ESLint rule bans "pg"
// anywhere else). Netlify Database's Postgres, at NETLIFY_DB_URL. Queries are
// plain SQL with $1-style parameters: no ORM.

let pool: Pool | undefined;

function getPool(): Pool {
  const connectionString = process.env.NETLIFY_DB_URL;
  if (!connectionString) throw new Error("NETLIFY_DB_URL is not set");
  // Serverless functions each hold their own pool, so keep it small.
  pool ??= new Pool({ connectionString, max: 3 });
  return pool;
}

/** Something that runs a query: the pool, or a client inside a transaction. */
export type Queryable = { query: PoolClient["query"] };

/** Runs one query and returns its rows. */
export async function query<Row extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
  db: Queryable = getPool(),
): Promise<Row[]> {
  return (await db.query<Row>(text, values)).rows;
}

/** Runs `work` in a transaction, rolled back if it throws. */
export async function transaction<T>(work: (db: Queryable) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
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

/** Closes the pool, so tests can switch databases or exit. */
export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = undefined;
}
