import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { query } from "@/lib/server/db";
import { isBlocked, recordProblem } from "@/lib/server/email";
import { getPolitician } from "@/lib/server/politicians";
import { createSession } from "@/lib/server/staff-auth";
import { addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { expectRedirect, requestCookies } from "@/tests/next-headers";
import {
  checkNow,
  decideSync,
  editSigner,
  importControlAiNow,
  importFromAirtable,
  markSigned,
  syncNow,
  unblockAddress,
} from "./actions";

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
const runs = () => query('SELECT job, status, started_by AS "startedBy" FROM import_runs ORDER BY id');

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
      () => markSigned(form({ politicianId: String(id), campaign: PM, signed: "1" })),
      () => importControlAiNow(),
      () => editSigner(form({ id: String(id), house: "lords", name: "X" })),
      () => syncNow(),
      () => checkNow(),
      () => decideSync(form({ id: "1", decision: "apply" })),
      () => importFromAirtable(),
      () => unblockAddress(form({ address: "a@example.org", note: "" })),
    ];
    for (const attempt of attempts) expect(await expectRedirect(attempt)).toBe("/staff/login");
    expect(await statusCount()).toBe(0);
    expect(await query("SELECT name FROM politicians")).toEqual([{ name: "Polly Placeholder" }]);
    expect(await query("SELECT count(*)::int AS n FROM import_runs")).toEqual([{ n: 0 }]);
  });

  it("markSigned marks a politician as signed today, or not, as the logged-in staff member", async () => {
    const id = await addTestPolitician();
    await markSigned(form({ politicianId: String(id), campaign: PM, signed: "1" }));
    expect((await getPolitician(id))!.statuses[PM]).toMatchObject({
      status: "signed",
      date: new Date().toISOString().slice(0, 10),
      updatedBy: "jo@pauseai.uk",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/staff/politicians");

    await markSigned(form({ politicianId: String(id), campaign: "support-sobel-bill", signed: "1" }));
    expect(await statusCount()).toBe(1);

    await markSigned(form({ politicianId: String(id), campaign: PM, signed: "" }));
    expect(await statusCount()).toBe(0);
  });

  it("importControlAiNow reads ControlAI's letter as the staff member, and keeps a failure rather than crashing the page", async () => {
    const id = await addTestPolitician();
    await importControlAiNow();
    expect((await getPolitician(id))!.statuses["support-sobel-bill"]).toMatchObject({ updatedBy: "controlai" });
    expect(revalidatePath).toHaveBeenCalledWith("/staff/import-data");

    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    server.use(http.get("https://controlai.org/uk-pm-letter", () => new HttpResponse(null, { status: 500 })));
    await importControlAiNow();
    expect(error).toHaveBeenCalledOnce();
    expect(await runs()).toEqual([
      { job: "import-controlai", status: "ok", startedBy: "jo@pauseai.uk" },
      { job: "import-controlai", status: "failed", startedBy: "jo@pauseai.uk" },
    ]);
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
    expect(await runs()).toEqual([{ job: "check-mps", status: "ok", startedBy: "jo@pauseai.uk" }]);
    expect(revalidatePath).toHaveBeenCalledWith("/staff/import-data");
  });

  it("syncNow copies the MPs from Airtable, and keeps a failure rather than crashing the page", async () => {
    await syncNow();
    expect(await query("SELECT count(*)::int AS n FROM politicians WHERE airtable_id IS NOT NULL")).toEqual([{ n: 2 }]);
    expect(revalidatePath).toHaveBeenCalledWith("/staff/import-data");

    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    server.use(http.get("https://*.airtable.com/v0/*", () => new HttpResponse(null, { status: 500 })));
    await syncNow();
    expect(error).toHaveBeenCalledOnce();
    expect(await runs()).toEqual([
      { job: "sync-mps", status: "applied", startedBy: "jo@pauseai.uk" },
      { job: "sync-mps", status: "failed", startedBy: "jo@pauseai.uk" },
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

  it("importFromAirtable imports the signatories, keeping the run, or the failure when Airtable isn't set up", async () => {
    vi.stubEnv("AIRTABLE_TOKEN", "");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await importFromAirtable();
    expect(error).toHaveBeenCalledOnce();

    vi.stubEnv("AIRTABLE_TOKEN", "token");
    server.use(
      http.get("https://*.airtable.com/v0/*", () =>
        HttpResponse.json({ records: [{ id: "r", fields: { "Full name or Title": "Lord X" } }] }),
      ),
    );
    await importFromAirtable();
    expect(await runs()).toEqual([
      { job: "import-signatories", status: "failed", startedBy: "jo@pauseai.uk" },
      { job: "import-signatories", status: "ok", startedBy: "jo@pauseai.uk" },
    ]);
    expect(await query("SELECT name FROM politicians")).toEqual([{ name: "Lord X" }]);
    expect(revalidatePath).toHaveBeenCalledWith("/staff/import-data");
  });

  it("unblockAddress unblocks an address, with the note, and refreshes every staff page", async () => {
    vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
    const bounce = { address: "a@example.org", messageId: null, kind: "hard" as const, reason: "", canReset: true };
    await recordProblem(bounce);
    await unblockAddress(form({ address: "nobody", note: "" }));
    expect(revalidatePath).not.toHaveBeenCalled();
    await unblockAddress(form({ address: "A@example.org", note: "Fixed" }));
    expect(await isBlocked("a@example.org")).toBe(false);
    expect(await query("SELECT actor, action, details FROM audit_log WHERE action = 'unblock address'")).toEqual([
      { actor: "jo@pauseai.uk", action: "unblock address", details: { address: "a@example.org", note: "Fixed" } },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/staff", "layout");
  });

  it("unblockAddress leaves the address blocked, and logs why, if Postmark can't be reached", async () => {
    vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    server.use(
      http.post("https://api.postmarkapp.com/message-streams/*", () => new HttpResponse(null, { status: 500 })),
    );
    await recordProblem({ address: "a@example.org", messageId: null, kind: "hard", reason: "", canReset: true });
    await unblockAddress(form({ address: "a@example.org", note: "" }));
    expect(await isBlocked("a@example.org")).toBe(true);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
