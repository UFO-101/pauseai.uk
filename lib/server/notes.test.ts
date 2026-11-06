import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { query } from "@/lib/server/db";
import { addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { eraseSupporter } from "./erasure";
import { addNote, deleteNote, editNote, notesOn } from "./notes";

const jo = { email: "jo@pauseai.uk", permissions: ["supporters" as const] };
const sam = { email: "sam@pauseai.uk", permissions: ["supporters" as const] };
const admin = { email: "ada@pauseai.uk", permissions: ["supporters" as const, "admin" as const] };
const noSupporters = { email: "kim@pauseai.uk", permissions: [] };

const at = (time: string) => vi.stubEnv("FIXTURE_NOW", time);

/** A supporter with a form entry giving `phone`, so two with the same mobile number are merged. */
async function supporter(phone: string): Promise<number> {
  const [{ id }] = await query<{ id: number }>("INSERT INTO supporters DEFAULT VALUES RETURNING id::int AS id");
  const [entry] = await query<{ id: number }>(
    `INSERT INTO form_entries (form, name, email, phone, contact_consent)
     VALUES ('march-2026-11', 'Jane Smith', $1, $2, false) RETURNING id::int AS id`,
    [`jane${id}@example.com`, phone],
  );
  await query(
    `INSERT INTO supporter_links (supporter_id, form_entry_id, matched_by, matched_value) VALUES ($1, $2, 'email', $3)`,
    [id, entry.id, `jane${id}@example.com`],
  );
  return id;
}

const log = () => query("SELECT actor, action, details FROM audit_log ORDER BY id");

describeWithDatabase("notes", () => {
  useTestDatabase();
  beforeEach(() => at("2026-11-02T09:00:00Z"));
  afterEach(() => vi.unstubAllEnvs());

  it("adds notes on a politician, newest first, at the site's time, and logs whom they're on but not what they say", async () => {
    const politicianId = await addTestPolitician();
    expect(await addNote({ politicianId }, "Met at the fair", noSupporters)).toBe(true);
    at("2026-11-02T10:00:00Z");
    expect(await addNote({ politicianId }, "See https://example.org", jo)).toBe(true);
    expect(await notesOn({ politicianId })).toEqual([
      {
        id: 2,
        body: "See https://example.org",
        writtenBy: "jo@pauseai.uk",
        createdAt: new Date("2026-11-02T10:00:00Z"),
        editedAt: null,
      },
      {
        id: 1,
        body: "Met at the fair",
        writtenBy: "kim@pauseai.uk",
        createdAt: new Date("2026-11-02T09:00:00Z"),
        editedAt: null,
      },
    ]);
    expect(await log()).toEqual([
      { actor: "kim@pauseai.uk", action: "add note", details: { noteId: 1, politicianId } },
      { actor: "jo@pauseai.uk", action: "add note", details: { noteId: 2, politicianId } },
    ]);
    expect(await addNote({ politicianId: politicianId + 1 }, "No one", jo)).toBe(false);
  });

  it("needs the supporters permission for a supporter's notes", async () => {
    const supporterId = await supporter("07700 900001");
    expect(await addNote({ supporterId }, "Keen to flyer", noSupporters)).toBe(false);
    expect(await addNote({ supporterId }, "Keen to flyer", jo)).toBe(true);
    expect(await editNote(1, "Changed", { ...jo, permissions: [] })).toBeUndefined();
    expect(await deleteNote(1, { ...admin, permissions: ["admin"] })).toBeUndefined();
    expect((await notesOn({ supporterId })).map((n) => n.body)).toEqual(["Keen to flyer"]);
  });

  it("lets the writer edit or delete a note for a day, and an admin delete one for a day too", async () => {
    const supporterId = await supporter("07700 900001");
    await addNote({ supporterId }, "First", jo);
    await addNote({ supporterId }, "Second", jo);
    at("2026-11-03T09:00:00Z");
    expect(await editNote(1, "Someone else's", sam)).toBeUndefined();
    expect(await deleteNote(1, sam)).toBeUndefined();
    expect(await editNote(1, "First, fixed", jo)).toEqual({ supporterId });
    expect(await deleteNote(99, jo)).toBeUndefined();
    expect(await deleteNote(2, admin)).toEqual({ supporterId });
    at("2026-11-03T09:00:01Z");
    expect(await editNote(1, "Too late", jo)).toBeUndefined();
    expect(await deleteNote(1, jo)).toBeUndefined();
    expect(await deleteNote(1, admin)).toBeUndefined();
    expect(await notesOn({ supporterId })).toEqual([
      expect.objectContaining({ id: 1, body: "First, fixed", editedAt: new Date("2026-11-03T09:00:00Z") }),
    ]);
    expect((await log()).slice(2)).toEqual([
      { actor: "jo@pauseai.uk", action: "edit note", details: { noteId: 1, supporterId } },
      { actor: "ada@pauseai.uk", action: "delete note", details: { noteId: 2, supporterId } },
    ]);
  });

  it("deletes a politician's note too, by the target it returns", async () => {
    const politicianId = await addTestPolitician();
    await addNote({ politicianId }, "Note", jo);
    expect(await deleteNote(1, jo)).toEqual({ politicianId });
  });

  it("moves a supporter's notes when they're merged into another, and erases them with the supporter", async () => {
    const older = await supporter("07700 900001");
    const newer = await supporter("+44 7700 900001");
    await addNote({ supporterId: newer }, "On the newer", jo);
    await query("SELECT merge_supporters_by_phone()");
    expect((await notesOn({ supporterId: older })).map((n) => n.body)).toEqual(["On the newer"]);
    await eraseSupporter(older, "ICO-1", "ada@pauseai.uk");
    expect(await query("SELECT count(*)::int AS n FROM notes")).toEqual([{ n: 0 }]);
  });
});
