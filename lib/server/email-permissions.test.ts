import { expect, it } from "vitest";
import { addTestMp, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { permissionsFor } from "./email-permissions";

describeWithDatabase("permissionsFor", () => {
  useTestDatabase();

  it("gathers each address's block, opt-outs, following, newest member record and newest letter", async () => {
    const mp = await addTestMp();
    await query(
      `INSERT INTO luma_people (user_id, email, name, contact_since) VALUES
         ('usr-1', 'jane@example.com', 'Jane', '2026-09-20T00:00:00Z'),
         ('usr-2', 'gus@example.com', 'Gus', '2026-09-01T00:00:00Z')`,
    );
    await query(
      `INSERT INTO opt_outs (address, list, source, source_ref, unsubscribed_at, resubscribed_at) VALUES
         ('jane@example.com', 'luma-calendar', 'luma-webhook', 'w1', '2026-10-16T00:00:00Z', NULL),
         ('jane@example.com', 'pauseai-updates', 'airtable-import', 'recOld', '2026-07-10T00:00:00Z', '2026-09-12T00:00:00Z')`,
    );
    await query(
      `INSERT INTO members (id, email, name, joined_at, created_at, keep_informed, share_permission, source_modified_at, removed_at) VALUES
         ('recJane', 'jane@example.com', 'Jane', '2026-09-12T00:00:00Z', '2026-09-12T00:00:00Z', true, true, '2026-09-12T00:00:00Z', NULL),
         ('recGone', 'gus@example.com', 'Gus', '2026-09-12T00:00:00Z', '2026-09-12T00:00:00Z', true, true, '2026-09-12T00:00:00Z', now())`,
    );
    for (const [hash, email, consent, at] of [
      ["a", "Jane@Example.com", false, "2026-10-01T00:00:00Z"],
      ["b", "jane@example.com", true, "2026-10-05T00:00:00Z"],
      ["c", "gus@example.com", true, "2026-10-05T00:00:00Z"],
    ] as const) {
      await query(
        `INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode, contact_consent, subject, reply_hash, status, created_at)
         VALUES ('regulate-letter-pm', $1, 'X', $2, 'x', 'ZZ9 9ZZ', $3, 'S', $4, 'sent', $5)`,
        [mp, email, consent, hash, at],
      );
    }
    const [{ id }] = await query<{ id: number }>(
      `INSERT INTO email_problems (address, kind, reason, can_reset, at) VALUES ('gus@example.com', 'complaint', 'spam', false, '2026-10-06T00:00:00Z')
       RETURNING id::int AS id`,
    );
    await query("INSERT INTO email_blocks (address, problem_id) VALUES ('gus@example.com', $1)", [id]);

    const permissions = await permissionsFor([" Jane@example.com", "gus@example.com", "nobody@example.com"]);
    const of = (address: string) =>
      permissions
        .filter((p) => p.address === address)
        .map((p) => [p.topic, p.send, p.reason, p.at && new Date(p.at).toISOString()]);
    expect(of("jane@example.com")).toEqual([
      ["luma-calendar", "no", "unsubscribed", "2026-10-16T00:00:00.000Z"],
      ["pauseai-updates", "unsure", "asked", "2026-09-12T00:00:00.000Z"],
      ["events-and-ways-to-help", "yes", "asked", "2026-10-05T00:00:00.000Z"],
    ]);
    expect(of("gus@example.com").map(([, send, reason]) => [send, reason])).toEqual([
      ["no", "blocked"],
      ["no", "blocked"],
      ["no", "blocked"],
    ]);
    // Nothing to do with any topic: no answers at all.
    expect(of("nobody@example.com")).toEqual([]);
    // In the order asked, a topic at a time.
    expect(permissions.map((p) => p.address)).toEqual([
      ...Array(3).fill("jane@example.com"),
      ...Array(3).fill("gus@example.com"),
    ]);
  });
});
