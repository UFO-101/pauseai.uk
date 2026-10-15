import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { query } from "@/lib/server/db";
import { getPolitician } from "@/lib/server/politicians";
import { createSession } from "@/lib/server/staff-auth";
import { addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { expectRedirect, requestCookies } from "@/tests/next-headers";
import { checkNow, decideSync, editSigner, importFromAirtable, saveStatus, syncNow } from "./actions";

vi.mock("next/headers", () => import("@/tests/next-headers"));
// revalidatePath needs a Next request; here it only needs to have been asked.
const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath }));

const PM = "regulate-letter-pm";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

const statusCount = async () => (await query<{ n: number }>("SELECT count(*)::int AS n FROM campaign_statuses"))[0].n;

describeWithDatabase("staff Server Actions", () => {
  useTestDatabase();

  beforeEach(async () => {
    requestCookies.clear();
    revalidatePath.mockClear();
    requestCookies.set("staff_session", await createSession("jo@pauseai.uk"));
    vi.stubEnv("AIRTABLE_TOKEN", "token");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("change nothing without a session", async () => {
    const id = await addTestPolitician();
    requestCookies.clear();
    const attempts = [
      () => saveStatus(form({ politicianId: String(id), campaign: PM, status: "signed" })),
      () => editSigner(form({ id: String(id), house: "lords", name: "X" })),
      () => syncNow(),
      () => checkNow(),
      () => decideSync(form({ id: "1", decision: "apply" })),
      () => importFromAirtable(),
    ];
    for (const attempt of attempts) expect(await expectRedirect(attempt)).toBe("/staff/login");
    expect(await statusCount()).toBe(0);
    expect(await query("SELECT name FROM politicians")).toEqual([{ name: "Polly Placeholder" }]);
  });

  it("saveStatus sets a status as the logged-in staff member", async () => {
    const id = await addTestPolitician();
    await saveStatus(form({ politicianId: String(id), campaign: PM, status: "signed", date: "", note: "" }));
    expect((await getPolitician(id))!.statuses[PM]).toMatchObject({ status: "signed", updatedBy: "jo@pauseai.uk" });
    expect(revalidatePath).toHaveBeenCalledWith(`/staff/politicians/${id}`);

    await saveStatus(form({ politicianId: String(id), campaign: "nope", status: "signed" }));
    expect(await statusCount()).toBe(1);
  });

  it("editSigner edits a signer from outside Airtable's MPs, and ignores a bad form", async () => {
    const id = await addTestPolitician({ airtableId: null, house: "lords", name: "Lord X" });
    await editSigner(form({ id: String(id), house: "lords", name: "Lord Y" }));
    expect((await getPolitician(id))!.name).toBe("Lord Y");
    await editSigner(form({ id: String(id), house: "lords", name: "" }));
    await editSigner(form({ id: "x", house: "lords", name: "Lord Z" }));
    expect((await getPolitician(id))!.name).toBe("Lord Y");
  });

  it("checkNow checks the MPs against Parliament's", async () => {
    await checkNow();
    expect(await query("SELECT count(*)::int AS n FROM mp_checks")).toEqual([{ n: 1 }]);
    expect(revalidatePath).toHaveBeenCalledWith("/staff/mp-check");
  });

  it("syncNow copies the MPs from Airtable", async () => {
    await syncNow();
    expect(await query("SELECT count(*)::int AS n FROM politicians WHERE airtable_id IS NOT NULL")).toEqual([{ n: 2 }]);
    expect(revalidatePath).toHaveBeenCalledWith("/staff/import");
  });

  it("decideSync applies or discards a held sync, and ignores a bad form", async () => {
    for (let i = 1; i <= 25; i++) await addTestPolitician({ airtableId: `rec${10000 + i}`, constituency: `Seat ${i}` });
    await syncNow();
    const [{ id }] = await query<{ id: number }>("SELECT id::int AS id FROM mp_syncs");
    await decideSync(form({ id: String(id), decision: "maybe" }));
    await decideSync(form({ id: "x", decision: "apply" }));
    expect(await query("SELECT status FROM mp_syncs")).toEqual([{ status: "held" }]);
    await decideSync(form({ id: String(id), decision: "discard" }));
    expect(await query("SELECT status, decided_by FROM mp_syncs")).toEqual([
      { status: "discarded", decided_by: "jo@pauseai.uk" },
    ]);
  });

  it("importFromAirtable imports and shows the counts, or says Airtable isn't set up", async () => {
    vi.stubEnv("AIRTABLE_TOKEN", "");
    expect(await expectRedirect(importFromAirtable)).toBe("/staff/import?unconfigured=1");

    vi.stubEnv("AIRTABLE_TOKEN", "token");
    server.use(
      http.get("https://*.airtable.com/v0/*", () =>
        HttpResponse.json({ records: [{ id: "r", fields: { "Full name or Title": "Lord X" } }] }),
      ),
    );
    expect(await expectRedirect(importFromAirtable)).toBe("/staff/import?matched=0&added=1&alreadySet=0");
  });
});
