import { beforeEach, expect, it, vi } from "vitest";
import { staffCopy } from "@/lib/content/staff-interface";
import { addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { recentChanges } from "./audit";
import { query, transaction } from "./db";
import {
  createSavedFilter,
  deleteSavedFilter,
  eraseFromSavedFilters,
  renameSavedFilter,
  savedFiltersState,
  updateSavedFilter,
} from "./saved-filters";

const JO = "jo@pauseai.uk";
const SAM = "sam@pauseai.uk";

/** Adds a supporter with these details, from a form entry, and returns their ID. */
async function addSupporter(name: string, email: string, phone: string, postcode: string): Promise<number> {
  const [{ id }] = await query<{ id: number }>("INSERT INTO supporters DEFAULT VALUES RETURNING id::int AS id");
  const [entry] = await query<{ id: number }>(
    `INSERT INTO form_entries (form, name, email, phone, postcode, contact_consent)
     VALUES ('march-2026-11', $1, $2, $3, $4, true) RETURNING id::int AS id`,
    [name, email, phone, postcode],
  );
  await query(
    "INSERT INTO supporter_links (supporter_id, form_entry_id, matched_by, matched_value) VALUES ($1, $2, 'email', $3)",
    [id, entry.id, email.toLowerCase()],
  );
  return id;
}

const erase = (id: number) => transaction((db) => eraseFromSavedFilters(id, JO, db));

const stored = async (id: number) =>
  (
    await query<{ name: string; params: object; updated_by: string | null }>(
      "SELECT name, params, updated_by FROM saved_filters WHERE id = $1",
      [id],
    )
  )[0];

describeWithDatabase("saved filters", () => {
  useTestDatabase();

  beforeEach(() => vi.useRealTimers());

  it("are listed per list, those changed most recently first, with who made them and when", async () => {
    const older = await createSavedFilter("events", "Older", { tag: "Talk" }, JO);
    const newer = await createSavedFilter("events", "Newer", {}, SAM);
    await createSavedFilter("politicians", "Theirs", { q: "x" }, JO);
    const { rows } = await savedFiltersState("events", {});
    expect(rows.map((row) => row.id)).toEqual([newer, older]);
    expect(rows[1]).toMatchObject({ name: "Older", params: { tag: "Talk" }, createdBy: JO });
    // Changing one brings it to the top, its creator as they were.
    await renameSavedFilter("events", older, "Older still", SAM);
    const after = await savedFiltersState("events", {});
    expect(after.rows.map((row) => row.name)).toEqual(["Older still", "Newer"]);
    expect(after.rows[0].createdBy).toBe(JO);
    expect(await stored(older)).toMatchObject({ updated_by: SAM });
  });

  it("allow the same name twice", async () => {
    await createSavedFilter("events", "Twice", {}, JO);
    await createSavedFilter("events", "Twice", {}, JO);
    expect((await savedFiltersState("events", {})).rows.map((row) => row.name)).toEqual(["Twice", "Twice"]);
  });

  it("keep only what a saved filter is, on being saved or updated", async () => {
    const id = await createSavedFilter("events", "One", { tag: "Talk", page: "3", saved: "9", mailing: "1" }, JO);
    expect((await stored(id)).params).toEqual({ tag: "Talk" });
    await updateSavedFilter("events", id, { place: "Leeds", page: "2" }, SAM);
    expect((await stored(id)).params).toEqual({ place: "Leeds" });
  });

  it("are loaded by an ID in the URL, the same whatever the parameters' order, or not edited", async () => {
    const id = await createSavedFilter("politicians", "Two", { flag: ["important", "connection"], sort: "name" }, JO);
    const { loaded, params } = await savedFiltersState("politicians", {
      saved: String(id),
      sort: "name",
      flag: ["connection", "important"],
      page: "2",
      mailing: "5",
    });
    expect(loaded).toMatchObject({ id, name: "Two", edited: false, gone: [] });
    expect(params).toMatchObject({ page: ["2"], mailing: ["5"] });
  });

  it("are edited once the URL's filters differ, including the sort", async () => {
    const id = await createSavedFilter("politicians", "Two", { flag: "important" }, JO);
    const edited = async (url: object) =>
      (await savedFiltersState("politicians", { saved: String(id), ...url })).loaded!.edited;
    expect(await edited({ flag: "important" })).toBe(false);
    expect(await edited({ flag: "important", nation: "scotland" })).toBe(true);
    expect(await edited({ flag: "important", sort: "name", dir: "desc" })).toBe(true);
    expect(await edited({})).toBe(true);
  });

  it("load nothing from an ID that's unknown, deleted, not one, or another list's", async () => {
    const id = await createSavedFilter("supporters", "Theirs", { q: "x" }, JO);
    for (const saved of ["999", "x", "99999999999999999999"]) {
      expect((await savedFiltersState("supporters", { saved })).loaded).toBeUndefined();
    }
    const other = await savedFiltersState("politicians", { saved: String(id) });
    expect(other.loaded).toBeUndefined();
    expect(other.rows).toEqual([]);
    expect(await updateSavedFilter("politicians", id, {}, JO)).toBe(false);
    expect(await renameSavedFilter("events", id, "No", JO)).toBe(false);
    expect(await deleteSavedFilter("events", id, JO)).toBe(false);
    expect((await stored(id)).name).toBe("Theirs");
    expect(await deleteSavedFilter("supporters", id, JO)).toBe(true);
    expect((await savedFiltersState("supporters", { saved: String(id) })).loaded).toBeUndefined();
  });

  it("leave out what no longer exists, from the list as from what counts as edited", async () => {
    await addTestPolitician({ party: "Labour" });
    const id = await createSavedFilter(
      "politicians",
      "Three",
      { party: ["Labour", "Reform Group"], flag: "important", sort: "name" },
      JO,
    );
    const url = { saved: String(id), party: ["Labour", "Reform Group"], flag: "important", sort: "name" };
    const { loaded, params } = await savedFiltersState("politicians", url);
    expect(loaded).toMatchObject({
      gone: ["party=Reform Group"],
      edited: false,
      params: { party: "Labour", flag: "important", sort: "name" },
    });
    expect(params.party).toEqual(["Labour"]);
    expect(params.sort).toEqual(["name"]);
  });

  it("find what's gone only among the values that choose, on any list", async () => {
    const id = await createSavedFilter("events", "Four", { when: "past", sort: "name", dir: "asc", tag: "Gone" }, JO);
    const { loaded } = await savedFiltersState("events", { saved: String(id), when: "past", sort: "name", dir: "asc" });
    expect(loaded).toMatchObject({ gone: ["tag=Gone"], edited: false });
  });

  it("log only their ID and list", async () => {
    const id = await createSavedFilter("supporters", "Jane Smith", { q: "jane.smith@example.com" }, JO);
    await updateSavedFilter("supporters", id, { q: "jane" }, JO);
    await renameSavedFilter("supporters", id, "Jane", JO);
    await deleteSavedFilter("supporters", id, JO);
    const { changes } = await recentChanges(true);
    expect(changes.map((change) => [change.action, change.details])).toEqual(
      ["delete filter", "rename filter", "update filter", "save filter"].map((action) => [
        action,
        { id, list: "supporters" },
      ]),
    );
  });

  it("lose a supporter's details on erasure, as exact values ignoring case, from names and typed parameters", async () => {
    const jane = await addSupporter("Jane Smith", "Jane.Smith@example.com", "07700 900123", "ZZ99 9ZZ");
    const byEmail = await createSavedFilter(
      "supporters",
      "Supporters: Search jane.smith@example.com",
      { q: "JANE.SMITH@EXAMPLE.COM", activity: "letter" },
      SAM,
    );
    const near = await createSavedFilter(
      "supporters",
      "Near zz99 9zz, can email",
      { near: "zz99 9zz", within: "25", q: "Someone else" },
      SAM,
    );
    const phone = await createSavedFilter("events", "07700 900123", { q: "07700 900123" }, SAM);
    const normalised = await createSavedFilter("politicians", "Calls", { q: "+447700900123" }, SAM);
    const nameOnly = await createSavedFilter("supporters", "jane smith", { q: " Jane Smith " }, SAM);
    await erase(jane);
    expect(await stored(byEmail)).toMatchObject({
      name: "Supporters: Search",
      params: { activity: "letter" },
      updated_by: JO,
    });
    expect((await stored(byEmail)).params).not.toHaveProperty("q");
    expect(await stored(near)).toMatchObject({ name: "Near, can email", params: { q: "Someone else" } });
    expect((await stored(near)).params).not.toHaveProperty("within");
    // Nothing of it is left: it has to be called something.
    expect((await stored(phone)).name).toBe(staffCopy.filters.saved.erasedName);
    expect((await stored(phone)).params).toEqual({});
    expect((await stored(normalised)).params).toEqual({});
    expect((await stored(nameOnly)).params).toEqual({});
  });

  it("keep what only looks like a supporter's details, and aren't touched when nothing changes", async () => {
    const jane = await addSupporter("Jane Smith", "jane.smith@example.com", "", "");
    const misspelt = await createSavedFilter("supporters", "Jayne Smith", { q: "Jayne Smith" }, SAM);
    const part = await createSavedFilter("supporters", "Jane Smithson", { q: "Jane" }, SAM);
    await erase(jane);
    expect(await stored(misspelt)).toEqual({ name: "Jayne Smith", params: { q: "Jayne Smith" }, updated_by: null });
    expect(await stored(part)).toEqual({ name: "Jane Smithson", params: { q: "Jane" }, updated_by: null });
  });

  it("are left alone for a supporter with no details found", async () => {
    const [{ id }] = await query<{ id: number }>("INSERT INTO supporters DEFAULT VALUES RETURNING id::int AS id");
    const filter = await createSavedFilter("supporters", "Anyone", { q: "Anyone" }, SAM);
    await erase(id);
    expect(await stored(filter)).toMatchObject({ name: "Anyone", updated_by: null });
  });
});
