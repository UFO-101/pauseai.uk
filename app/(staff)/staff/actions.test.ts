import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { query } from "@/lib/server/db";
import { isBlocked, recordProblem } from "@/lib/server/email";
import { getPolitician } from "@/lib/server/politicians";
import { createSession } from "@/lib/server/staff-auth";
import { saveStaffAccount } from "@/lib/server/staff-accounts";
import { addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { expectRedirect, requestCookies } from "@/tests/next-headers";
import {
  checkNow,
  decideSync,
  eraseSupporterNow,
  importControlAiNow,
  importGoToParliamentNow,
  importWebFormLettersNow,
  syncEmailsNow,
  importLumaNow,
  importMembersNow,
  endStaffSessionsNow,
  setAskStatus,
  removeStaffAccountNow,
  saveStaffAccountNow,
  syncNow,
  unblockAddress,
} from "./actions";

vi.mock("next/headers", () => import("@/tests/next-headers"));
// revalidatePath needs a Next request; here it only needs to have been asked.
const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath }));

const PM = "frontier-ai-letter";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

const statusCount = async () => (await query<{ n: number }>("SELECT count(*)::int AS n FROM ask_statuses"))[0].n;
const runs = () => query('SELECT job, status, started_by AS "startedBy" FROM import_runs ORDER BY id');

describeWithDatabase("staff Server Actions", () => {
  useTestDatabase();

  beforeEach(async () => {
    requestCookies.clear();
    revalidatePath.mockClear();
    requestCookies.set("staff_session", await createSession("jo@pauseai.uk"));
    // The session made jo an account, with no permissions; they come per test.
    vi.stubEnv("AIRTABLE_TOKEN", "token");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("change nothing without a session", async () => {
    const id = await addTestPolitician();
    requestCookies.clear();
    const attempts = [
      () => setAskStatus(form({ politicianId: String(id), ask: PM, status: "signed" })),
      () => importControlAiNow(),
      () => syncNow(),
      () => checkNow(),
      () => decideSync(form({ id: "1", decision: "apply" })),
      () => syncEmailsNow(),
      () => importWebFormLettersNow(),
      () => importGoToParliamentNow(),
      () => importLumaNow(),
      () => importMembersNow(),
      () => removeStaffAccountNow(form({ email: "x@pauseai.uk" })),
      () => saveStaffAccountNow(form({ email: "jo@pauseai.uk", "permission:admin": "on" })),
      () => eraseSupporterNow(form({ id: "1", reference: "r", confirm: "on" })),
      () => unblockAddress(form({ address: "a@example.org", note: "" })),
      () => endStaffSessionsNow(form({ email: "jo@pauseai.uk" })),
    ];
    for (const attempt of attempts) expect(await expectRedirect(attempt)).toBe("/staff/login");
    expect(await statusCount()).toBe(0);
    expect(await query("SELECT name FROM notable_people")).toEqual([{ name: "Polly Placeholder" }]);
    expect(await query("SELECT count(*)::int AS n FROM import_runs")).toEqual([{ n: 0 }]);
  });

  it("setAskStatus marks a politician as signed today, with a note, or not, as the logged-in staff member", async () => {
    const id = await addTestPolitician();
    await setAskStatus(form({ politicianId: String(id), ask: PM, status: "signed", note: "At the march" }));
    expect((await getPolitician(id))!.statuses[PM]).toMatchObject({
      status: "signed",
      date: new Date().toISOString().slice(0, 10),
      note: "At the march",
      updatedBy: "jo@pauseai.uk",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/staff/politicians");

    // ControlAI's statement is the import's alone.
    await setAskStatus(form({ politicianId: String(id), ask: "controlai-statement", status: "signed" }));
    expect(await statusCount()).toBe(1);

    await setAskStatus(form({ politicianId: String(id), ask: PM, status: "", note: "Kept" }));
    expect(await statusCount()).toBe(0);
    expect(await query("SELECT details->>'note' AS note FROM audit_log ORDER BY id DESC LIMIT 1")).toEqual([
      { note: "" },
    ]);
  });

  it("importControlAiNow reads ControlAI's letter as the staff member, and keeps a failure rather than crashing the page", async () => {
    const id = await addTestPolitician();
    await importControlAiNow();
    expect((await getPolitician(id))!.statuses["controlai-statement"]).toMatchObject({ updatedBy: "controlai" });
    expect(revalidatePath).toHaveBeenCalledWith("/staff/import-data");
    // Its own page, the overview, and the home page's actions.
    expect(revalidatePath).toHaveBeenCalledWith("/staff/import-data/controlai");
    expect(revalidatePath).toHaveBeenCalledWith("/staff");

    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    server.use(http.get("https://controlai.org/uk-pm-letter", () => new HttpResponse(null, { status: 500 })));
    await importControlAiNow();
    expect(error).toHaveBeenCalledOnce();
    expect(await runs()).toEqual([
      { job: "import-controlai", status: "ok", startedBy: "jo@pauseai.uk" },
      { job: "import-controlai", status: "failed", startedBy: "jo@pauseai.uk" },
    ]);
  });

  it("saveStaffAccountNow adds or changes an account and removeStaffAccountNow removes one, as an admin, going back to the page", async () => {
    const save = () => saveStaffAccountNow(form({ email: "Sam@pauseai.uk", "permission:supporters": "on" }));
    expect(await expectRedirect(save)).toBe("/staff");
    await saveStaffAccount("jo@pauseai.uk", ["admin"], "a");
    expect(await expectRedirect(save)).toBe("/staff/accounts");
    expect(await query("SELECT email, permissions, added_by FROM staff_accounts ORDER BY email")).toEqual([
      { email: "jo@pauseai.uk", permissions: ["admin"], added_by: "login" },
      { email: "sam@pauseai.uk", permissions: ["supporters"], added_by: "jo@pauseai.uk" },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/staff/accounts");
    // The last admin can't lose admin, and the page says so.
    expect(await expectRedirect(() => saveStaffAccountNow(form({ email: "jo@pauseai.uk" })))).toBe(
      "/staff/accounts?notice=last-admin",
    );
    expect(await expectRedirect(() => removeStaffAccountNow(form({ email: "sam@pauseai.uk" })))).toBe(
      "/staff/accounts",
    );
    expect(await query("SELECT count(*)::int AS n FROM staff_accounts")).toEqual([{ n: 1 }]);
    // An address not at pauseai.uk is refused, and the page says so.
    expect(await expectRedirect(() => saveStaffAccountNow(form({ email: "sam@example.com" })))).toBe(
      "/staff/accounts?notice=not-pauseai",
    );
    // A bad form does nothing.
    await saveStaffAccountNow(form({ email: "nobody" }));
    await removeStaffAccountNow(form({ email: "nobody" }));
    expect(await query("SELECT count(*)::int AS n FROM staff_accounts")).toEqual([{ n: 1 }]);
  });

  it("eraseSupporterNow needs the supporters permission, erases, and goes to the list; a bad form or no such supporter does nothing", async () => {
    vi.stubEnv("LUMA_API_KEY", "k");
    const erase = () => eraseSupporterNow(form({ id: "1", reference: "ICO-1", confirm: "on" }));
    expect(await expectRedirect(erase)).toBe("/staff");
    await saveStaffAccount("jo@pauseai.uk", ["supporters"], "a");
    await importLumaNow();
    expect(await expectRedirect(erase)).toBe("/staff/supporters?erased=1");
    expect(await query("SELECT 1 FROM supporters WHERE id = 1")).toEqual([]);
    expect(revalidatePath).toHaveBeenCalledWith("/staff", "layout");
    await erase();
    await eraseSupporterNow(form({ id: "2", reference: "" }));
    expect(await query("SELECT count(*)::int AS n FROM supporters")).toEqual([{ n: 5 }]);
  });

  it("importLumaNow copies the Luma calendar as the staff member", async () => {
    vi.stubEnv("LUMA_API_KEY", "k");
    await importLumaNow();
    expect(await runs()).toEqual([{ job: "import-luma", status: "ok", startedBy: "jo@pauseai.uk" }]);
    expect(await query("SELECT count(*)::int AS n FROM luma_events")).toEqual([{ n: 9 }]);
    expect(revalidatePath).toHaveBeenCalledWith("/staff/import-data");
  });

  it("importMembersNow copies the members as the staff member", async () => {
    await importMembersNow();
    expect(await runs()).toEqual([{ job: "import-members", status: "ok", startedBy: "jo@pauseai.uk" }]);
    expect(await query("SELECT count(*)::int AS n FROM members")).toEqual([{ n: 8 }]);
    expect(revalidatePath).toHaveBeenCalledWith("/staff/import-data/members");
  });

  it("checkNow checks the MPs against Parliament's", async () => {
    await checkNow();
    expect(await runs()).toEqual([{ job: "check-mps", status: "ok", startedBy: "jo@pauseai.uk" }]);
    expect(revalidatePath).toHaveBeenCalledWith("/staff/import-data");
  });

  it("syncNow copies the politicians from Airtable, and keeps a failure rather than crashing the page", async () => {
    await syncNow();
    expect(await query("SELECT count(*)::int AS n FROM notable_people WHERE airtable_id IS NOT NULL")).toEqual([
      { n: 6 },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/staff/import-data");

    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    server.use(http.get("https://*.airtable.com/v0/*", () => new HttpResponse(null, { status: 500 })));
    await syncNow();
    expect(error).toHaveBeenCalledOnce();
    expect(await runs()).toEqual([
      { job: "sync-politicians", status: "applied", startedBy: "jo@pauseai.uk" },
      { job: "sync-politicians", status: "failed", startedBy: "jo@pauseai.uk" },
    ]);
  });

  it("decideSync applies or discards a held sync, and ignores a bad form", async () => {
    for (let i = 1; i <= 25; i++) await addTestPolitician({ airtableId: `rec${10000 + i}`, constituency: `Seat ${i}` });
    await syncNow();
    const [{ id }] = await query<{ id: number }>("SELECT id::int AS id FROM import_runs");
    await decideSync(form({ id: String(id), decision: "maybe" }));
    await decideSync(form({ id: "x", decision: "apply" }));
    expect(await query("SELECT status FROM import_runs")).toEqual([{ status: "held" }]);
    await decideSync(form({ id: String(id), decision: "discard" }));
    expect(await query("SELECT status, decided_by FROM import_runs")).toEqual([
      { status: "discarded", decided_by: "jo@pauseai.uk" },
    ]);
  });

  it("runs the Emails sync and the one-off imports as the staff member, keeping a failure rather than crashing the page", async () => {
    await syncNow();
    await syncEmailsNow();
    await importWebFormLettersNow();
    await importGoToParliamentNow();
    expect((await runs()).slice(1)).toEqual([
      { job: "sync-emails", status: "ok", startedBy: "jo@pauseai.uk" },
      { job: "import-web-form-letters", status: "ok", startedBy: "jo@pauseai.uk" },
      { job: "import-go-to-parliament", status: "ok", startedBy: "jo@pauseai.uk" },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/staff/import-data/emails");
    expect(revalidatePath).toHaveBeenCalledWith("/staff/import-data/web-form-letters");
    expect(revalidatePath).toHaveBeenCalledWith("/staff/import-data/go-to-parliament");
  });

  it("endStaffSessionsNow ends an account's sessions, as an admin, going back to the page", async () => {
    await createSession("sam@pauseai.uk");
    const end = () => endStaffSessionsNow(form({ email: "sam@pauseai.uk" }));
    expect(await expectRedirect(end)).toBe("/staff");
    expect(await query("SELECT count(*)::int AS n FROM staff_sessions WHERE email = 'sam@pauseai.uk'")).toEqual([
      { n: 1 },
    ]);
    await saveStaffAccount("jo@pauseai.uk", ["admin"], "a");
    expect(await expectRedirect(end)).toBe("/staff/accounts");
    expect(await query("SELECT count(*)::int AS n FROM staff_sessions WHERE email = 'sam@pauseai.uk'")).toEqual([
      { n: 0 },
    ]);
    // A bad form does nothing.
    await endStaffSessionsNow(form({ email: "nobody" }));
    expect(await query("SELECT actor, action FROM audit_log WHERE action = 'end staff sessions'")).toEqual([
      { actor: "jo@pauseai.uk", action: "end staff sessions" },
    ]);
  });

  it("unblockAddress unblocks an address, with the note, and refreshes every staff page", async () => {
    vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
    await saveStaffAccount("jo@pauseai.uk", ["supporters"], "test");
    const bounce = { address: "a@example.org", messageId: null, kind: "hard" as const, reason: "", canReset: true };
    await recordProblem(bounce);
    await unblockAddress(form({ address: "nobody", note: "Fixed" }));
    await unblockAddress(form({ address: "A@example.org", note: " " }));
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(await isBlocked("a@example.org")).toBe(true);
    await unblockAddress(form({ address: "A@example.org", note: "Fixed" }));
    expect(await isBlocked("a@example.org")).toBe(false);
    expect(await query("SELECT actor, action, details FROM audit_log WHERE action = 'unblock address'")).toEqual([
      { actor: "jo@pauseai.uk", action: "unblock address", details: { address: "a@example.org", note: "Fixed" } },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/staff", "layout");
  });

  it("unblockAddress unblocks only a politician's address without supporters", async () => {
    vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
    await addTestPolitician({ email: "Polly@example.org" });
    for (const address of ["polly@example.org", "jane@example.com"]) {
      await recordProblem({ address, messageId: null, kind: "hard", reason: "", canReset: true });
      await unblockAddress(form({ address, note: "Fixed" }));
    }
    expect(await isBlocked("polly@example.org")).toBe(false);
    expect(await isBlocked("jane@example.com")).toBe(true);
  });

  it("unblockAddress leaves the address blocked, and logs why, if Postmark can't be reached", async () => {
    vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
    await saveStaffAccount("jo@pauseai.uk", ["supporters"], "test");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    server.use(
      http.post("https://api.postmarkapp.com/message-streams/*", () => new HttpResponse(null, { status: 500 })),
    );
    await recordProblem({ address: "a@example.org", messageId: null, kind: "hard", reason: "", canReset: true });
    await unblockAddress(form({ address: "a@example.org", note: "Fixed" }));
    expect(await isBlocked("a@example.org")).toBe(true);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
