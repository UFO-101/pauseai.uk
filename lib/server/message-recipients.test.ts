import { expect, it } from "vitest";
import { query } from "@/lib/server/db";
import { staffCopy } from "@/lib/content/staff-interface";
import { addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { addFollower } from "@/tests/message-fixtures";
import { localGroupOf, supporterAudience } from "./message-recipients";
import { refreshSupportersList } from "./supporter-facts";
import { linkSupporters } from "./supporters";

const copy = staffCopy.messagePages;
const FILTER = { list: "supporters" as const, params: {} };
const EMAIL = { channel: "email" as const, topic: "luma-calendar" as const };

it("finds the local group a place is in, or none", () => {
  expect(localGroupOf("Salford")).toBe(copy.localGroupName("Manchester"));
  expect(localGroupOf("Truro")).toBeNull();
  expect(localGroupOf(null)).toBeNull();
});

describeWithDatabase("who a message to supporters goes to", () => {
  useTestDatabase();

  it("fills in their fields, with a fallback for those without, and says how many lack each", async () => {
    await query(
      `INSERT INTO postcode_places (postcode, latitude, longitude, place, country, constituency, constituency_checked)
       VALUES ('M11AE', 53.4794, -2.2353, 'Manchester', 'england', 'Manchester Central', true)`,
    );
    await addTestPolitician({ name: "Mo Manchester", constituency: "Manchester Central", airtableId: "recMo" });
    const jane = await addFollower("usr-1", "jane@example.com", "Jane Smith", { postcode: "M1 1AE" });
    const sam = await addFollower("usr-2", "sam@example.com", "");
    const { recipients, fields, conditions, leftOut } = await supporterAudience(FILTER, EMAIL);
    expect(leftOut).toEqual([]);
    expect(recipients.find((one) => one.id === jane)).toMatchObject({
      name: "Jane Smith",
      address: "jane@example.com",
      values: { firstName: "Jane", localGroup: copy.localGroupName("Manchester"), mp: "Mo Manchester" },
      meets: ["has:firstName", "has:localGroup", "has:mp"],
    });
    expect(recipients.find((one) => one.id === sam)).toMatchObject({
      name: staffCopy.supporters.noName,
      values: { firstName: copy.fallbacks.firstName, mp: copy.fallbacks.mp },
    });
    expect(fields.map(({ id, lacking, fallback }) => ({ id, lacking, fallback }))).toEqual([
      { id: "firstName", lacking: 1, fallback: true },
      { id: "localGroup", lacking: expect.any(Number), fallback: true },
      { id: "mp", lacking: 1, fallback: true },
    ]);
    expect(conditions.find((one) => one.id === "has:mp")?.covers).toBe(1);
    expect(conditions.find((one) => one.id === "member:yes")?.covers).toBe(0);
  });

  it("marks those who volunteer and members, for their own parts", async () => {
    await query(
      `INSERT INTO members (id, email, name, phone, joined_at, created_at, keep_informed, share_permission, intent, source_modified_at)
       VALUES ('recJane', 'jane@example.com', 'Jane', '07700 900001', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', true, true, 'Volunteer', '2026-01-01T00:00:00Z')`,
    );
    await linkSupporters();
    await refreshSupportersList();
    const { recipients, conditions } = await supporterAudience(FILTER, { channel: "text", topic: "volunteering" });
    expect(recipients[0].meets).toEqual(["has:firstName", "volunteer:yes", "member:yes"]);
    expect(conditions.find((one) => one.id === "volunteer:yes")?.covers).toBe(1);
  });

  it("uses a number that said yes, for a text", async () => {
    await addFollower("usr-1", "jane@example.com", "Jane", { phone: "07700 900001" });
    const { recipients } = await supporterAudience(FILTER, { channel: "text", topic: "luma-calendar" });
    expect(recipients.map((one) => one.address)).toEqual(["+447700900001"]);
  });

  it("leaves out, with why, those with no yes, a stop or a blocked address", async () => {
    const pat = await addFollower("usr-1", "pat@example.com", "Pat");
    await query("UPDATE luma_people SET contact_since = NULL WHERE user_id = 'usr-1'");
    const sam = await addFollower("usr-2", "sam@example.com", "Sam");
    await query(
      `INSERT INTO opt_outs (address, list, source, source_ref, unsubscribed_at)
       VALUES ('sam@example.com', 'luma-calendar', 'luma-webhook', 'msg-1', '2026-10-01T00:00:00Z')`,
    );
    const bob = await addFollower("usr-3", "bob@example.com", "Bob");
    await query(
      `WITH p AS (INSERT INTO email_problems (address, kind, at, can_reset) VALUES ('bob@example.com', 'hard', '2026-10-13T00:00:00Z', false) RETURNING id)
       INSERT INTO email_blocks (address, problem_id) SELECT 'bob@example.com', id FROM p`,
    );
    const nobody = await addFollower("usr-4", "nobody@example.com", "");
    const { recipients, leftOut } = await supporterAudience(FILTER, { channel: "text", topic: "site-forms" });
    expect(recipients).toEqual([]);
    expect(leftOut.map((one) => one.reason)).toEqual(expect.arrayContaining(["no-permission"]));
    const email = await supporterAudience(FILTER, EMAIL);
    expect(email.recipients.map((one) => one.id)).toEqual([nobody]);
    expect(email.leftOut).toEqual(
      expect.arrayContaining([
        { id: pat, name: "Pat", reason: "no-permission" },
        { id: sam, name: "Sam", reason: "stopped" },
        { id: bob, name: "Bob", reason: "blocked" },
      ]),
    );
    // Someone with no name is said so.
    await query("UPDATE luma_people SET contact_since = NULL WHERE user_id = 'usr-4'");
    expect((await supporterAudience(FILTER, EMAIL)).leftOut.find((one) => one.id === nobody)?.name).toBe(
      staffCopy.supporters.noName,
    );
  });
});
