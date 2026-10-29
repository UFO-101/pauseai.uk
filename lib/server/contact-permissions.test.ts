import { expect, it } from "vitest";
import type { Topic } from "@/lib/contact-permissions";
import { addTestLetter, addTestMp, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { permissionsFor } from "./contact-permissions";

/** A Luma account, a contact of the calendar since `since` or not one. */
async function luma(email: string, since: string | null) {
  await query("INSERT INTO luma_people (user_id, email, contact_since) VALUES ($1, $2, $3)", [
    `usr-${email}`,
    email,
    since,
  ]);
}

/** A member record: made at `createdAt`, with "Keep me informed" ticked or not, removed or not, and a phone and intent if given. */
async function member(
  id: string,
  email: string,
  createdAt: string,
  keepInformed: boolean,
  removed = false,
  phone: string | null = null,
  intent: string | null = null,
) {
  await query(
    `INSERT INTO members (id, email, name, joined_at, created_at, keep_informed, share_permission, source_modified_at, removed_at, phone, intent)
     VALUES ($1, $2, 'X', $3, $3, $4, true, $3, $5, $6, $7)`,
    [id, email, createdAt, keepInformed, removed ? createdAt : null, phone, intent],
  );
}

/** A registration for an event by `email`'s Luma account, giving `phone`. */
async function lumaGuest(email: string, phone: string) {
  await query(
    `INSERT INTO luma_events (id, name, url, start_at, access) VALUES ('evt-1', 'E', 'e', '2026-10-01T18:00:00Z', 'manage')
     ON CONFLICT DO NOTHING`,
  );
  await query(
    `INSERT INTO luma_guests (id, event_id, user_id, approval_status, registered_at, phone)
     VALUES ($1, 'evt-1', $2, 'approved', '2026-09-30T00:00:00Z', $3)`,
    [`gst-${email}-${phone}`, `usr-${email}`, phone],
  );
}

/** An entry on `form` from `email`, giving `phone`, with the consent box ticked or not. */
async function formEntry(email: string, form: string, phone: string, consent: boolean, at: string) {
  await query(
    `INSERT INTO form_entries (form, created_at, name, email, phone, contact_consent) VALUES ($1, $2, 'X', $3, $4, $5)`,
    [form, at, email, phone, consent],
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
async function answer(address: string, topic: Topic) {
  const found = (await permissionsFor([address])).find((p) => p.topic === topic);
  return found && [found.send, found.reason, found.at && new Date(found.at).toISOString(), found.source];
}

/** One number's answer for a topic, as [send, reason, at, source]; undefined when the topic doesn't apply. */
async function phoneAnswer(number: string, topic: Topic) {
  const found = (await permissionsFor([], [number])).find((p) => p.topic === topic);
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
      ["gus@example.com", "site-forms"],
      ["jane@example.com", "luma-calendar"],
      ["jane@example.com", "pauseai-updates"],
      ["jane@example.com", "site-forms"],
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
    expect(await answer("gus@example.com", "site-forms")).toEqual(blocked);
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
    // contact_unsubscribes is the views' unsubscribes, found from the opt-outs.
    const unsubscribes = "SELECT channel, topic, address, send, reason, at, source FROM %s ORDER BY address";
    const fromView = await query(unsubscribes.replace("%s", "contact_permissions WHERE reason = 'unsubscribed'"));
    expect(fromView.map((row) => row.address)).toEqual(["left@example.com", "stranger@example.com"]);
    expect(await query(unsubscribes.replace("%s", "contact_unsubscribes"))).toEqual(fromView);
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

  it("emails about our forms whoever agreed on the newest form they filled in", async () => {
    const mp = await addTestMp();
    await letter(mp, "agreed@example.com", false, "2026-10-01T00:00:00Z");
    await letter(mp, "agreed@example.com", true, "2026-10-05T00:00:00Z");
    expect(await answer("agreed@example.com", "site-forms")).toEqual([
      "yes",
      "asked",
      "2026-10-05T00:00:00.000Z",
      "email-your-mp",
    ]);
    await letter(mp, "changed@example.com", true, "2026-10-01T00:00:00Z");
    await letter(mp, "changed@example.com", false, "2026-10-05T00:00:00Z");
    expect(await answer("changed@example.com", "site-forms")).toEqual([
      "no",
      "declined",
      "2026-10-05T00:00:00.000Z",
      "email-your-mp",
    ]);
  });

  it("answers each number by the sources that gave it, after the addresses", async () => {
    await member("recVol", "vol@example.com", "2026-09-12T00:00:00Z", true, false, "07700 900123", "Volunteer");
    await formEntry("site@example.com", "web-form", "+44 7700 900123", true, "2026-10-01T00:00:00Z");
    const permissions = await permissionsFor(["vol@example.com"], ["+447700900123", "+447700900999"]);
    expect(permissions.map((p) => [p.channel, p.address, p.topic])).toEqual([
      ["email", "vol@example.com", "pauseai-updates"],
      ["phone", "+447700900123", "site-forms"],
      ["phone", "+447700900123", "volunteering"],
    ]);
  });

  it("gives a Luma number its account's answer: yes while it follows the calendar, no once it unsubscribes", async () => {
    await luma("pat@example.com", "2026-09-20T00:00:00Z");
    await lumaGuest("pat@example.com", "+447700900001");
    expect(await phoneAnswer("+447700900001", "luma-calendar")).toEqual([
      "yes",
      "following",
      "2026-09-20T00:00:00.000Z",
      "luma",
    ]);
    await lumaOptOut("pat@example.com", "2026-10-23T00:00:00Z");
    expect(await phoneAnswer("+447700900001", "luma-calendar")).toEqual([
      "no",
      "unsubscribed",
      "2026-10-23T00:00:00.000Z",
      "luma",
    ]);
    // Another account that gave the same number and still follows is a yes.
    await luma("pat2@example.com", "2026-10-01T00:00:00Z");
    await lumaGuest("pat2@example.com", "+447700900001");
    expect((await phoneAnswer("+447700900001", "luma-calendar"))?.slice(0, 2)).toEqual(["yes", "following"]);
    // An account that registered but never followed.
    await luma("drop@example.com", null);
    await lumaGuest("drop@example.com", "+447700900002");
    expect(await phoneAnswer("+447700900002", "luma-calendar")).toEqual(["no", "not-following", null, "luma"]);
    // A Luma unsubscribe says nothing about the same number given elsewhere.
    await lumaGuest("pat@example.com", "+447700900003");
    await formEntry("pat@example.com", "web-form", "07700900003", true, "2026-10-01T00:00:00Z");
    expect((await phoneAnswer("+447700900003", "site-forms"))?.slice(0, 2)).toEqual(["yes", "asked"]);
  });

  it("takes a volunteer's number as a yes, as one from before the form asked, another member's as unsure, and a removed member's as no", async () => {
    await member("recV", "v@example.com", "2026-09-12T00:00:00Z", false, false, "+447700900010", "Volunteer");
    expect(await phoneAnswer("+447700900010", "volunteering")).toEqual([
      "yes",
      "volunteered",
      "2026-09-12T00:00:00.000Z",
      "member",
    ]);
    // The join form before it asked what they wanted to do: a volunteer's.
    await member("recT", "t@example.com", "2025-06-06T00:00:00Z", true, false, "+447700900013", null);
    expect((await phoneAnswer("+447700900013", "volunteering"))?.slice(0, 2)).toEqual(["yes", "volunteered"]);
    // No intent on a record from after the Tally form didn't choose to volunteer.
    await member("recN", "n@example.com", "2026-09-12T00:00:00Z", true, false, "+447700900014", null);
    expect((await phoneAnswer("+447700900014", "volunteering"))?.slice(0, 2)).toEqual(["unsure", "gave-number"]);
    await member("recO", "o@example.com", "2026-03-01T00:00:00Z", true, false, "+447700900011", "Act now");
    expect((await phoneAnswer("+447700900011", "volunteering"))?.slice(0, 2)).toEqual(["unsure", "gave-number"]);
    await member("recR", "r@example.com", "2026-09-12T00:00:00Z", true, true, "+447700900012", "Volunteer");
    expect((await phoneAnswer("+447700900012", "volunteering"))?.slice(0, 2)).toEqual(["no", "removed"]);
  });

  it("texts on the march's day whoever gave a number on its form, until the day ends; after, only those who agreed", async () => {
    await formEntry("m@example.com", "march-2026-11", "07700 900020", false, "2026-10-20T00:00:00Z");
    await formEntry("a@example.com", "march-2026-11", "07700 900021", true, "2026-10-20T00:00:00Z");
    await query("UPDATE day_texts SET ends_at = now() + interval '1 day'");
    expect(await phoneAnswer("+447700900020", "march-day")).toEqual([
      "yes",
      "gave-number",
      "2026-10-20T00:00:00.000Z",
      "march-2026-11",
    ]);
    expect((await phoneAnswer("+447700900020", "site-forms"))?.slice(0, 2)).toEqual(["no", "declined"]);
    await query("UPDATE day_texts SET ends_at = now() - interval '1 day'");
    expect((await phoneAnswer("+447700900020", "march-day"))?.slice(0, 2)).toEqual(["no", "ended"]);
    expect((await phoneAnswer("+447700900021", "site-forms"))?.slice(0, 2)).toEqual(["yes", "asked"]);
    // A number from another form has no march-day answer.
    await formEntry("w@example.com", "web-form", "07700 900022", true, "2026-10-20T00:00:00Z");
    expect(await phoneAnswer("+447700900022", "march-day")).toBeUndefined();
  });

  it("finds whether any topic lets us use a number", async () => {
    await member("recV", "v@example.com", "2026-09-12T00:00:00Z", false, false, "+447700900030", "Volunteer");
    await luma("gone@example.com", "2026-09-20T00:00:00Z");
    await lumaGuest("gone@example.com", "+447700900031");
    await lumaOptOut("gone@example.com", "2026-10-23T00:00:00Z");
    const usable = async (number: string) =>
      (await query<{ ok: boolean }>("SELECT phone_usable($1) AS ok", [number]))[0].ok;
    expect(await usable("+447700900030")).toBe(true);
    expect(await usable("+447700900031")).toBe(false);
    expect(await usable("+447700900099")).toBe(false);
  });

  it("writes numbers the same way, however they were typed", async () => {
    const written = async (raw: string | null) =>
      (await query<{ n: string | null }>("SELECT phone_number($1) AS n", [raw]))[0].n;
    for (const raw of ["07700 900123", "+44 (0)7700 900123", "0044 7700-900123", "447700900123", "+447700900123"]) {
      expect(await written(raw)).toBe("+447700900123");
    }
    expect(await written("+1 (555) 000-0000")).toBe("+15550000000");
    // One that can't be read as a number is kept as typed, trimmed; a blank is none.
    expect(await written(" ext. 12 ")).toBe("ext. 12");
    expect(await written("  ")).toBeNull();
    expect(await written(null)).toBeNull();
  });
});
