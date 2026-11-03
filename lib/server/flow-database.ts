import "server-only";
import { FLOW_DATABASE_COOKIE, FLOW_DATABASE_PREFIX } from "@/tests/fixture-env.mjs";

// In a fixture build (DATA_FIXTURES=1), the storyboard gives each flow its
// own database and names it in a cookie: db.ts queries it, and the fakes
// that keep what they're sent (outside-fetch.ts) keep a set for each.
// Apart from db.ts, so a binding can ask without importing the database.

const FLOW_DATABASE = new RegExp(`^${FLOW_DATABASE_PREFIX}\\w+$`);

/** The database this request's storyboard cookie names, if it's one a flow may use. */
export async function flowDatabase(): Promise<string | undefined> {
  try {
    const { cookies } = await import("next/headers");
    const value = (await cookies()).get(FLOW_DATABASE_COOKIE)?.value;
    return value && FLOW_DATABASE.test(value) ? value : undefined;
  } catch {
    // Outside a request: a unit test, or the build.
    return undefined;
  }
}
