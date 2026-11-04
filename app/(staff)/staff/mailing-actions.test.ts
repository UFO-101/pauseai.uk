import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { query } from "@/lib/server/db";
import { createDraft, getWrittenMailing, saveDraft, type MailingChanges } from "@/lib/server/mailing-drafts";
import { createSession } from "@/lib/server/staff-auth";
import { addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { expectRedirect, requestCookies } from "@/tests/next-headers";
import {
  attachToMailing,
  deleteMailingDraft,
  detachFromMailing,
  newMailing,
  pasteNames,
  pickFound,
  pickMany,
  pickPolitician,
  rescheduleMailingNow,
  untickAll,
  saveMailing,
  scheduleMailingNow,
  sendMailingTest,
  stopMailingNow,
} from "./mailing-actions";

vi.mock("next/headers", () => import("@/tests/next-headers"));
const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath }));

const JO = "jo@pauseai.uk";
const LETTER = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }] };

/** A draft by Jo, with no one ticked, and its first changes. */
const draft = (changes: MailingChanges = {}) =>
  createDraft(JO, { list: "politicians", params: {}, picked: { ids: [] } }, changes);

function form(fields: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    for (const one of [value].flat()) data.append(name, one);
  }
  return data;
}

describeWithDatabase("the mailing pages' Server Actions", () => {
  useTestDatabase();

  beforeEach(async () => {
    requestCookies.clear();
    revalidatePath.mockClear();
    requestCookies.set("staff_session", await createSession(JO));
  });
  afterEach(() => vi.unstubAllEnvs());

  it("change nothing without a session", async () => {
    requestCookies.clear();
    const attempts = [
      () => newMailing(form({})),
      () => pickPolitician(1, 1, true),
      () => pickFound(1, {}, true),
      () => pasteNames(form({ names: "Jo" })),
      () => pickMany(1, [1], true),
      () => untickAll(1),
      () => saveMailing(1, 1, { subject: "x" }),
      () => attachToMailing(form({ id: "1" })),
      () => detachFromMailing(1, 1, 1),
      () => sendMailingTest(1, 1),
      () => scheduleMailingNow(1, 1),
      () => deleteMailingDraft(form({ id: "1" })),
      () => stopMailingNow(form({ id: "1" })),
      () => rescheduleMailingNow(form({ id: "1", day: "2026-12-01", hour: "9" })),
    ];
    for (const attempt of attempts) expect(await expectRedirect(attempt)).toBe("/staff/login");
    expect(await query("SELECT 1 FROM mailings WHERE body IS NOT NULL")).toEqual([]);
  });

  it("makes a new mailing with no one ticked, or everyone the list's filter finds, and chooses for it", async () => {
    const polly = await addTestPolitician();
    await addTestPolitician({ name: "Lord Sample", airtableId: "rec2", house: "lords" });
    const empty = await expectRedirect(() => newMailing(form({})));
    const id = Number(empty.match(/^\/staff\/politicians\?mailing=(\d+)$/)![1]);
    expect(await getWrittenMailing(id)).toMatchObject({ createdBy: JO, filter: { picked: { ids: [] } } });
    expect(revalidatePath).toHaveBeenCalledWith("/staff/mailings");

    const found = await expectRedirect(() => newMailing(form({ house: "commons", sort: "name", found: "1" })));
    const ticked = Number(found.match(/^\/staff\/politicians\?house=commons&mailing=(\d+)$/)![1]);
    expect((await getWrittenMailing(ticked))!.filter).toEqual({
      list: "politicians",
      params: {},
      picked: { ids: [polly], from: { params: { house: "commons" }, at: expect.any(String), found: [polly] } },
    });
  });

  it("saves a draft's changes, and refuses what isn't a change", async () => {
    const { id } = await draft({ subject: "Hi", body: LETTER as MailingChanges["body"] });
    expect(await saveMailing(id, 1, { sentFrom: "Jo@PauseAI.uk", dueAt: "2026-12-01T09:00:00Z" })).toEqual({
      saved: true,
      version: 2,
    });
    expect(await getWrittenMailing(id)).toMatchObject({ sentFrom: JO, dueAt: new Date("2026-12-01T09:00:00Z") });
    expect(await saveMailing(id, 2, { subject: 3 })).toBeUndefined();
    expect(await saveMailing(id, 2, { filter: { list: "politicians", params: {} } })).toBeUndefined();
  });

  it("ticks and unticks a politician, and everyone the list's filter finds", async () => {
    const polly = await addTestPolitician();
    const lord = await addTestPolitician({ name: "Lord Sample", airtableId: "rec2", house: "lords" });
    const { id } = await draft();
    const ticked = async () => (await getWrittenMailing(id))!.filter.picked!.ids;
    await pickPolitician(id, lord, true);
    expect(await ticked()).toEqual([lord]);
    expect(revalidatePath).toHaveBeenCalledWith("/staff/politicians");
    await pickFound(id, { house: "commons" }, true);
    expect(await ticked()).toEqual([lord, polly]);
    await pickPolitician(id, lord, false);
    expect(await ticked()).toEqual([polly]);
    await pickFound(id, { house: "commons" }, false);
    expect(await ticked()).toEqual([]);
    // Everyone unticked, and the group they were ticked from forgotten, to start again.
    await pickFound(id, { house: "commons" }, true);
    await untickAll(id);
    expect((await getWrittenMailing(id))!.filter.picked).toEqual({ ids: [] });
  });

  it("goes to the paste tab with the names pasted, a line each, ticking no one; and ticks many at once", async () => {
    const polly = await addTestPolitician();
    const { id } = await draft();
    const back = `/staff/politicians?q=pol&mailing=${id}&pasted=old`;
    const to = await expectRedirect(() =>
      pasteNames(form({ back, names: "  Polly Placeholder MP \r\n\nNobody Atall\n" })),
    );
    expect(to).toBe(
      `/staff/politicians?q=pol&mailing=${id}&pasted=Polly+Placeholder+MP&pasted=Nobody+Atall&tab=pasted`,
    );
    expect((await getWrittenMailing(id))!.filter.picked!.ids).toEqual([]);
    // Back somewhere that isn't a staff page goes to the list; no names, nowhere.
    expect(await expectRedirect(() => pasteNames(form({ back: "https://example.org", names: "x" })))).toBe(
      "/staff/politicians?pasted=x&tab=pasted",
    );
    await pasteNames(form({}));
    await pickMany(id, [polly], true);
    expect((await getWrittenMailing(id))!.filter.picked!.ids).toEqual([polly]);
    await pickMany(id, [polly], false);
    expect((await getWrittenMailing(id))!.filter.picked!.ids).toEqual([]);
  });

  it("attaches a file and takes it off, saying what's attached", async () => {
    const { id } = await draft({ subject: "Hi" });
    const file = new File(["%PDF"], "brief.pdf", { type: "application/pdf" });
    const attached = await attachToMailing(withFile(id, 1, file));
    expect(attached).toMatchObject({ saved: true, version: 2, attachments: [{ filename: "brief.pdf", size: 4 }] });
    const untyped = await attachToMailing(withFile(id, 2, new File(["x"], "notes")));
    expect(untyped).toMatchObject({ saved: true, attachments: [{}, { filename: "notes" }] });
    expect(await query("SELECT content_type FROM mailing_attachments ORDER BY id")).toEqual([
      { content_type: "application/pdf" },
      { content_type: "application/octet-stream" },
    ]);
    // No file, or no draft to say.
    expect(await attachToMailing(form({ id: String(id), version: "3" }))).toBeUndefined();
    expect(await attachToMailing(withFile(0, 3, file))).toBeUndefined();
    expect(await attachToMailing(withFile(999, 3, file))).toMatchObject({ saved: false, attachments: [] });
    const [first] = attached!.attachments;
    expect(await detachFromMailing(id, 3, first.id)).toMatchObject({
      saved: true,
      attachments: [{ filename: "notes" }],
    });
    expect(await detachFromMailing(999, 1, first.id)).toMatchObject({ saved: false, attachments: [] });
  });

  it("sends a test copy of one recipient's email to the staff member, and none to someone it doesn't go to", async () => {
    vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
    let to = "";
    server.use(
      http.post("https://api.postmarkapp.com/email", async ({ request }) => {
        to = ((await request.json()) as { To: string }).To;
        return HttpResponse.json({ MessageID: "m", ErrorCode: 0 });
      }),
    );
    const polly = await addTestPolitician();
    const { id } = await createDraft(
      JO,
      { list: "politicians", params: {}, picked: { ids: [polly] } },
      { subject: "Hi", body: LETTER as MailingChanges["body"] },
    );
    expect(await sendMailingTest(id, polly)).toMatchObject({ sent: true, id: "m", to: JO });
    // To the recipient's name, at the staff member's address.
    expect(to).toBe(`"Polly Placeholder" <${JO}>`);
    // To another address given; nothing to one that isn't one.
    expect(await sendMailingTest(id, polly, " sam@example.org ")).toMatchObject({ sent: true, to: "sam@example.org" });
    expect(to).toBe('"Polly Placeholder" <sam@example.org>');
    expect(await sendMailingTest(id, polly, "not an address")).toBeUndefined();
    expect(await sendMailingTest(id, polly + 1)).toBeUndefined();
    expect(await sendMailingTest(999, polly)).toBeUndefined();
  });

  it("won't schedule while anything stops it, and says why", async () => {
    const { id } = await draft({ subject: "Hi" });
    expect(await scheduleMailingNow(id, 1)).toMatchObject({
      scheduled: false,
      problems: expect.arrayContaining(["no-sender", "no-letter"]),
    });
  });

  it("deletes a draft and goes to the list; a bad form only goes to the list", async () => {
    const { id } = await draft({ subject: "Hi" });
    expect(await expectRedirect(() => deleteMailingDraft(form({ id: "x" })))).toBe("/staff/mailings");
    expect(await getWrittenMailing(id)).toBeDefined();
    expect(await expectRedirect(() => deleteMailingDraft(form({ id: String(id) })))).toBe("/staff/mailings");
    expect(await getWrittenMailing(id)).toBeUndefined();
  });

  it("stops a scheduled mailing and changes its time, in London's hours; a bad form changes nothing", async () => {
    const { id } = await draft({ subject: "Hi" });
    await saveDraft(id, 1, { sentFrom: JO, fromName: "Jo", dueAt: "2099-01-01T09:00:00Z" });
    await query("UPDATE mailings SET state = 'scheduled' WHERE id = $1", [id]);
    for (const bad of [
      { id: "x" },
      { id: String(id), day: "soon", hour: "9" },
      { id: String(id), day: "2099-07-01", hour: "24" },
    ] as Record<string, string>[]) {
      await rescheduleMailingNow(form(bad));
    }
    expect((await getWrittenMailing(id))!.dueAt).toEqual(new Date("2099-01-01T09:00:00Z"));
    await rescheduleMailingNow(form({ id: String(id), day: "2099-07-01", hour: "10" }));
    expect((await getWrittenMailing(id))!.dueAt).toEqual(new Date("2099-07-01T09:00:00Z"));
    expect(revalidatePath).toHaveBeenCalledWith(`/staff/mailings/${id}`);

    await stopMailingNow(form({ id: "x" }));
    expect((await getWrittenMailing(id))!.state).toBe("scheduled");
    await stopMailingNow(form({ id: String(id) }));
    expect((await getWrittenMailing(id))!.state).toBe("draft");
  });
});

/** The form that attaches `file` to draft `id` at `version`. */
function withFile(id: number, version: number, file: File) {
  const data = new FormData();
  data.set("id", String(id));
  data.set("version", String(version));
  data.set("file", file);
  return data;
}
