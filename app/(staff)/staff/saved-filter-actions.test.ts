import { beforeEach, expect, it, vi } from "vitest";
import { query } from "@/lib/server/db";
import { createSavedFilter, savedFiltersState } from "@/lib/server/saved-filters";
import { createSession } from "@/lib/server/staff-auth";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { expectRedirect, requestCookies } from "@/tests/next-headers";
import { deleteFilter, renameFilter, saveFilter, updateFilter } from "./saved-filter-actions";

vi.mock("next/headers", () => import("@/tests/next-headers"));
const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath }));

const JO = "jo@pauseai.uk";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.append(name, value);
  return data;
}

const filters = async () =>
  query<{ id: number; list: string; name: string; params: object; created_by: string }>(
    "SELECT id::int AS id, list, name, params, created_by FROM saved_filters ORDER BY id",
  );

describeWithDatabase("the saved filters' Server Actions", () => {
  useTestDatabase();

  beforeEach(async () => {
    requestCookies.clear();
    revalidatePath.mockClear();
    await query(
      "INSERT INTO staff_accounts (email, permissions, added_by) VALUES ($1, '{supporters}', 'admin@pauseai.uk')",
      [JO],
    );
    requestCookies.set("staff_session", await createSession(JO));
  });

  it("change nothing without a session", async () => {
    requestCookies.clear();
    const id = await createSavedFilter("events", "One", {}, JO);
    for (const action of [saveFilter, updateFilter, renameFilter, deleteFilter]) {
      expect(await expectRedirect(() => action(form({ list: "events", id: String(id), name: "New" })))).toContain(
        "/staff/login",
      );
    }
    expect(await filters()).toMatchObject([{ id, name: "One" }]);
  });

  it("need the supporters permission for that list, but not the others", async () => {
    const id = await createSavedFilter("supporters", "Theirs", {}, JO);
    await query("UPDATE staff_accounts SET permissions = '{}' WHERE email = $1", [JO]);
    const attempt = { list: "supporters", id: String(id), name: "New", back: "/staff/supporters?q=x" };
    for (const action of [saveFilter, updateFilter, renameFilter, deleteFilter]) {
      expect(await expectRedirect(() => action(form(attempt)))).toBe("/staff");
    }
    expect(await filters()).toMatchObject([{ id, name: "Theirs" }]);
    await expectRedirect(() => saveFilter(form({ list: "events", name: "Mine", back: "/staff/events?q=x" })));
    expect(await filters()).toHaveLength(2);
  });

  it("refuse a list without saved filters, a blank name and a missing ID", async () => {
    await saveFilter(form({ list: "mailings", name: "New" }));
    await saveFilter(form({ list: "events", name: "  " }));
    await renameFilter(form({ list: "events", id: "1", name: "" }));
    await renameFilter(form({ list: "events", name: "New" }));
    await renameFilter(form({ name: "New", id: "1" }));
    await updateFilter(form({ list: "events" }));
    await updateFilter(form({ id: "1" }));
    await deleteFilter(form({ list: "events" }));
    await deleteFilter(form({ id: "1" }));
    expect(await filters()).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("save what the page has on, loaded, keeping who a mailing's for, not its page", async () => {
    const back = "/staff/politicians?party=Labour&party=Green&sort=name&page=3&mailing=12&pasted=Jo";
    const to = await expectRedirect(() => saveFilter(form({ list: "politicians", name: "Labour\n  or Green", back })));
    const [saved] = await filters();
    expect(saved).toMatchObject({
      list: "politicians",
      name: "Labour or Green",
      params: { party: ["Labour", "Green"], sort: "name" },
      created_by: JO,
    });
    expect(to).toBe(`/staff/politicians?party=Labour&party=Green&sort=name&mailing=12&pasted=Jo&saved=${saved.id}`);
    expect(revalidatePath).toHaveBeenCalledWith("/staff/politicians");
  });

  it("go back only to the list's own page", async () => {
    for (const back of ["https://example.com/", "/staff/supporters?q=secret", "/staff/events-more"]) {
      const to = await expectRedirect(() => saveFilter(form({ list: "events", name: "One", back })));
      expect(to).toMatch(/^\/staff\/events\?saved=\d+$/);
    }
    expect((await filters()).map((one) => one.params)).toEqual([{}, {}, {}]);
    await expectRedirect(() => saveFilter(form({ list: "events", name: "No back" })));
    expect(await filters()).toHaveLength(4);
  });

  it("update a filter with what the page has on, staying loaded", async () => {
    const id = await createSavedFilter("events", "One", { tag: "Talk" }, JO);
    const to = await expectRedirect(() =>
      updateFilter(form({ list: "events", id: String(id), back: `/staff/events?tag=Stall&saved=${id}` })),
    );
    expect(to).toBe(`/staff/events?tag=Stall&saved=${id}`);
    expect((await savedFiltersState("events", { saved: String(id), tag: "Stall" })).loaded?.edited).toBe(false);
  });

  it("update nothing that isn't that list's", async () => {
    const id = await createSavedFilter("supporters", "One", { q: "x" }, JO);
    await updateFilter(form({ list: "events", id: String(id), back: "/staff/events?tag=Stall" }));
    expect(await filters()).toMatchObject([{ params: { q: "x" } }]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rename a filter, staying on the page", async () => {
    const id = await createSavedFilter("events", "One", {}, JO);
    await renameFilter(form({ list: "events", id: String(id), name: " Two " }));
    expect(await filters()).toMatchObject([{ name: "Two" }]);
    expect(revalidatePath).toHaveBeenCalledWith("/staff/events");
  });

  it("delete a filter and go back to the page", async () => {
    const id = await createSavedFilter("events", "One", {}, JO);
    const back = `/staff/events?tag=Talk&page=2&saved=${id}`;
    expect(await expectRedirect(() => deleteFilter(form({ list: "events", id: String(id), back })))).toBe(back);
    expect(await filters()).toEqual([]);
  });
});
