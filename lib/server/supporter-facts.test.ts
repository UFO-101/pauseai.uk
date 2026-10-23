import { expect, it } from "vitest";
import { query } from "@/lib/server/db";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { refreshSupporterFacts } from "./supporter-facts";

describeWithDatabase("refreshSupporterFacts", () => {
  useTestDatabase();

  /** Each supporter's first seen, by their Luma user. */
  const firstSeen = () =>
    query(
      `SELECT k.luma_user_id AS user, s.first_seen_at AS at FROM supporters s
       JOIN supporter_links k ON k.supporter_id = s.id ORDER BY k.luma_user_id`,
    );

  it("sets each supporter's first seen to their earliest record, null with none that gives a time, for those asked for or everyone, writing only what changed", async () => {
    await query(
      `INSERT INTO luma_events (id, name, url, start_at, access) VALUES ('evt-1', 'E', 'https://luma.com/e', '2026-06-01T00:00:00Z', 'manage');
       INSERT INTO luma_people (user_id, email, name, contact_since) VALUES
         ('usr-1', 'a@example.com', 'A', '2026-03-01T00:00:00Z'), ('usr-2', 'b@example.com', 'B', NULL), ('usr-3', 'c@example.com', 'C', NULL);
       INSERT INTO luma_guests (id, event_id, user_id, approval_status, registered_at) VALUES
         ('g-1', 'evt-1', 'usr-1', 'approved', '2026-05-01T00:00:00Z'), ('g-2', 'evt-1', 'usr-2', 'approved', '2026-05-02T00:00:00Z');
       INSERT INTO supporters (id) OVERRIDING SYSTEM VALUE VALUES (1), (2), (3);
       INSERT INTO supporter_links (supporter_id, luma_user_id, matched_by, matched_value) VALUES
         (1, 'usr-1', 'email', 'a@example.com'), (2, 'usr-2', 'email', 'b@example.com'), (3, 'usr-3', 'email', 'c@example.com')`,
    );
    // Only those asked for, when given some.
    expect(await refreshSupporterFacts(undefined, [2, 3])).toBe(1);
    expect(await firstSeen()).toEqual([
      { user: "usr-1", at: null },
      { user: "usr-2", at: new Date("2026-05-02T00:00:00Z") },
      { user: "usr-3", at: null },
    ]);
    // usr-3 has neither a contact date nor a registration, so already reads null.
    expect(await refreshSupporterFacts()).toBe(1);
    expect(await firstSeen()).toEqual([
      { user: "usr-1", at: new Date("2026-03-01T00:00:00Z") },
      { user: "usr-2", at: new Date("2026-05-02T00:00:00Z") },
      { user: "usr-3", at: null },
    ]);
    expect(await refreshSupporterFacts()).toBe(0);

    // A record goes: the supporter is first seen by the one left, or by none.
    await query("DELETE FROM luma_guests WHERE id = 'g-2'");
    await query("UPDATE luma_people SET contact_since = '2026-04-01T00:00:00Z' WHERE user_id = 'usr-3'");
    expect(await refreshSupporterFacts()).toBe(2);
    expect(await firstSeen()).toEqual([
      { user: "usr-1", at: new Date("2026-03-01T00:00:00Z") },
      { user: "usr-2", at: null },
      { user: "usr-3", at: new Date("2026-04-01T00:00:00Z") },
    ]);
  });
});
