import type { APIRequestContext } from "@playwright/test";

// Helpers shared by the behaviour tests that need data in the database.
export const BASE = process.env.LOCAL_URL ?? "http://localhost:3000";

/**
 * Copies the fixture MPs from Parliament into the behaviour database, and
 * adds the test MP, through the nightly sync's own route.
 */
export async function syncFixtureMps(request: APIRequestContext) {
  const res = await request.post(`${BASE}/api/cron/sync-mps`, { headers: { Authorization: "Bearer fixture-cron-secret" } });
  if (!res.ok()) throw new Error(`MP sync failed: ${res.status()} ${await res.text()}`);
}
