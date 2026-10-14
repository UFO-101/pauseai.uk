import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { query } from "@/lib/server/db";
import { addTestMp, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { POST } from "./route";

beforeEach(() => vi.stubEnv("CRON_SECRET", "s3cret"));
afterEach(() => vi.unstubAllEnvs());

const call = (authorization: string) => POST(new Request("https://pauseai.uk/api/cron/delete-unconfirmed-letters", { method: "POST", headers: { authorization } }));

describeWithDatabase("POST /api/cron/delete-unconfirmed-letters", () => {
  useTestDatabase();

  it("deletes letters unconfirmed for 7 days, and says how many", async () => {
    const mp = await addTestMp();
    await query(
      `INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode, contact_consent, subject, body, reply_hash, status, created_at)
       VALUES ('regulate-letter-pm', $1, 'Jane', 'jane@example.com', 'x', 'ZZ9 9ZZ', false, 'S', 'B', 'h', 'unconfirmed', now() - interval '8 days')`,
      [mp],
    );
    expect(await (await call("Bearer s3cret")).json()).toEqual({ deleted: 1 });
  });

  it("refuses anyone without the secret", async () => {
    expect((await call("Bearer guess")).status).toBe(401);
  });
});
