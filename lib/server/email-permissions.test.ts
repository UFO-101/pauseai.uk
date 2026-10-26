import { expect, it } from "vitest";
import type { EmailTopic } from "@/lib/email-permissions";
import { addTestLetter, addTestMp, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { permissionsFor } from "./email-permissions";

/** A Luma account, a contact of the calendar since `since` or not one. */
async function luma(email: string, since: string | null) {
  await query("INSERT INTO luma_people (user_id, email, contact_since) VALUES ($1, $2, $3)", [
    `usr-${email}`,
    email,
    since,
  ]);
}

/** A member record: made at `createdAt`, with "Keep me informed" ticked or not, and removed or not. */
async function member(id: string, email: string, createdAt: string, keepInformed: boolean, removed = false) {
  await query(
    `INSERT INTO members (id, email, name, joined_at, created_at, keep_informed, share_permission, source_modified_at, removed_at)
     VALUES ($1, $2, 'X', $3, $3, $4, true, $3, $5)`,
    [id, email, createdAt, keepInformed, removed ? createdAt : null],
  );
}

/** A letter from `email`, with the consent box ticked or not. */
async function letter(mp: number, email: string, consent: boolean, at: string) {
  await addTestLetter({
    politicianId: mp,
    senderEmail: email,
    contactConsent: consent,
    replyHash: `${email}-${at}`,
    createdAt: at,
  });
}

/** An opt-out from Luma's webhook, lifted at `resubscribedAt` if given. */
async function lumaOptOut(address: string, at: string, resubscribedAt: string | null = null) {
  await query(
    `INSERT INTO opt_outs (address, list, source, source_ref, unsubscribed_at, resubscribed_at)
     VALUES ($1, 'luma-calendar', 'luma-webhook', $2, $3, $4)`,
    [address, `w-${address}-${at}`, at, resubscribedAt],
  );
}

/** One address's answer for a topic, as [send, reason, at, source]; undefined when the topic doesn't apply. */
async function answer(address: string, topic: EmailTopic) {
  const found = (await permissionsFor([address])).find((p) => p.topic === topic);
  return found && [found.send, found.reason, found.at && new Date(found.at).toISOString(), found.source];
}

describeWithDatabase("permissionsFor", () => {
  useTestDatabase();

  it("answers each address in the order asked, a topic at a time, and only the topics it has had anything to do with", async () => {
    const mp = await addTestMp();
    await luma("jane@example.com", "2026-09-20T00:00:00Z");
    await member("recJane", "jane@example.com", "2026-09-12T00:00:00Z", true);
    await letter(mp, "Jane@Example.com ", true, "2026-10-05T00:00:00Z");
    await letter(mp, "gus@example.com", true, "2026-10-05T00:00:00Z");
    const permissions = await permissionsFor(["gus@example.com", " Jane@example.com", "nobody@example.com"]);
    expect(permissions.map((p) => [p.address, p.topic])).toEqual([
      ["gus@example.com", "events-and-ways-to-help"],
      ["jane@example.com", "luma-calendar"],
      ["jane@example.com", "pauseai-updates"],
      ["jane@example.com", "events-and-ways-to-help"],
    ]);
    // Times come as text.
    expect(typeof permissions[0].at).toBe("string");
  });

  it("says no to every topic for a blocked address, whatever else it said", async () => {
    const mp = await addTestMp();
    await luma("gus@example.com", "2026-10-22T09:00:00Z");
    await member("recGus", "gus@example.com", "2026-09-12T00:00:00Z", true);
    await letter(mp, "gus@example.com", true, "2026-10-05T00:00:00Z");
    const [{ id }] = await query<{ id: number }>(
      `INSERT INTO email_problems (address, kind, reason, can_reset, at)
       VALUES ('gus@example.com', 'complaint', 'spam', false, '2026-10-06T00:00:00Z') RETURNING id::int AS id`,
    );
    await query("INSERT INTO email_blocks (address, problem_id) VALUES ('gus@example.com', $1)", [id]);
    const blocked = ["no", "blocked", "2026-10-06T00:00:00.000Z", "complaint"];
    expect(await answer("gus@example.com", "luma-calendar")).toEqual(blocked);
    expect(await answer("gus@example.com", "pauseai-updates")).toEqual(blocked);
    expect(await answer("gus@example.com", "events-and-ways-to-help")).toEqual(blocked);
  });

  it("emails the calendar's contacts, however long ago they joined, not those who unsubscribed or never were one", async () => {
    await luma("new@example.com", "2026-10-22T09:00:00Z");
    expect(await answer("new@example.com", "luma-calendar")).toEqual([
      "yes",
      "following",
      "2026-10-22T09:00:00.000Z",
      "luma",
    ]);
    // Luma's list leaves out anyone who unsubscribed, so a contact from long ago is still one.
    await luma("old@example.com", "2026-09-20T00:00:00Z");
    expect(await answer("old@example.com", "luma-calendar")).toEqual([
      "yes",
      "following",
      "2026-09-20T00:00:00.000Z",
      "luma",
    ]);
    await luma("left@example.com", "2026-09-20T00:00:00Z");
    await lumaOptOut("left@example.com", "2026-10-23T00:00:00Z");
    expect(await answer("left@example.com", "luma-calendar")).toEqual([
      "no",
      "unsubscribed",
      "2026-10-23T00:00:00.000Z",
      "luma-webhook",
    ]);
    // An opt-out that's been lifted no longer counts.
    await luma("back@example.com", "2026-10-22T09:00:00Z");
    await lumaOptOut("back@example.com", "2026-10-22T10:00:00Z", "2026-10-22T11:00:00Z");
    expect(await answer("back@example.com", "luma-calendar")).toEqual(expect.arrayContaining(["yes", "following"]));
    // Known from an event, but not a contact of the calendar.
    await luma("guest@example.com", null);
    expect(await answer("guest@example.com", "luma-calendar")).toEqual(["no", "not-following", null, null]);
    // An unsubscribe can arrive before we know whose address it is.
    await lumaOptOut("stranger@example.com", "2026-10-23T00:00:00Z");
    expect(await answer("stranger@example.com", "luma-calendar")).toEqual(
      expect.arrayContaining(["no", "unsubscribed"]),
    );
    // A block is its answer instead.
    await lumaOptOut("blocked@example.com", "2026-10-23T00:00:00Z");
    const [{ id }] = await query<{ id: number }>(
      `INSERT INTO email_problems (address, kind, reason, can_reset, at)
       VALUES ('blocked@example.com', 'hard', 'gone', true, '2026-10-24T00:00:00Z') RETURNING id::int AS id`,
    );
    await query("INSERT INTO email_blocks (address, problem_id) VALUES ('blocked@example.com', $1)", [id]);
    // email_unsubscribes is the view's unsubscribes, found from the opt-outs.
    const unsubscribes = "SELECT topic, address, send, reason, at, source FROM %s ORDER BY address";
    const fromView = await query(unsubscribes.replace("%s", "email_permissions WHERE reason = 'unsubscribed'"));
    expect(fromView.map((row) => row.address)).toEqual(["left@example.com", "stranger@example.com"]);
    expect(await query(unsubscribes.replace("%s", "email_unsubscribes"))).toEqual(fromView);
  });

  it("is unsure of members who asked or joined before it was a choice, and says no to those who declined or left", async () => {
    // Every yes is unsure: the updates come from CiviCRM, whose unsubscribes we don't read.
    await member("recAsked", "asked@example.com", "2026-09-12T00:00:00Z", true);
    expect(await answer("asked@example.com", "pauseai-updates")).toEqual([
      "unsure",
      "asked",
      "2026-09-12T00:00:00.000Z",
      "member",
    ]);
    await member("recDeclined", "declined@example.com", "2026-09-12T00:00:00Z", false);
    expect(await answer("declined@example.com", "pauseai-updates")).toEqual([
      "no",
      "declined",
      "2026-09-12T00:00:00.000Z",
      "member",
    ]);
    // Before 30 June 2026 the form required the box, or had none: on the list either way.
    await member("recTicked", "ticked@example.com", "2026-03-03T00:00:00Z", true);
    await member("recUnticked", "unticked@example.com", "2025-11-29T00:00:00Z", false);
    expect((await answer("ticked@example.com", "pauseai-updates"))?.slice(0, 2)).toEqual(["unsure", "joined"]);
    expect((await answer("unticked@example.com", "pauseai-updates"))?.slice(0, 2)).toEqual(["unsure", "joined"]);
    // No longer shared with us.
    await member("recGone", "gone@example.com", "2026-09-12T00:00:00Z", true, true);
    expect((await answer("gone@example.com", "pauseai-updates"))?.slice(0, 2)).toEqual(["no", "removed"]);
    // The newest record decides, one still shared before one removed.
    await member("recFirst", "twice@example.com", "2026-07-10T00:00:00Z", false);
    await member("recSecond", "twice@example.com", "2026-09-01T00:00:00Z", true);
    await member("recRemoved", "twice@example.com", "2026-10-01T00:00:00Z", false, true);
    expect(await answer("twice@example.com", "pauseai-updates")).toEqual([
      "unsure",
      "asked",
      "2026-09-01T00:00:00.000Z",
      "member",
    ]);
  });

  it("sends news of events and ways to help to whoever agreed on their newest letter", async () => {
    const mp = await addTestMp();
    await letter(mp, "agreed@example.com", false, "2026-10-01T00:00:00Z");
    await letter(mp, "agreed@example.com", true, "2026-10-05T00:00:00Z");
    expect(await answer("agreed@example.com", "events-and-ways-to-help")).toEqual([
      "yes",
      "asked",
      "2026-10-05T00:00:00.000Z",
      "letter",
    ]);
    await letter(mp, "changed@example.com", true, "2026-10-01T00:00:00Z");
    await letter(mp, "changed@example.com", false, "2026-10-05T00:00:00Z");
    expect(await answer("changed@example.com", "events-and-ways-to-help")).toEqual([
      "no",
      "declined",
      "2026-10-05T00:00:00.000Z",
      "letter",
    ]);
  });
});
