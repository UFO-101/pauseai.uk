import { expect, it } from "vitest";
import { addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { createDraft, saveDraft } from "./mailing-drafts";
import { getMailing, listMailings, mailingsOverview, mailingTitle } from "./mailings";

/** A PauseAI letter of the mailing titled `title`, to `politicianId`. */
async function addLetter(
  title: string,
  politicianId: number,
  { status = "sent", sent = "2026-10-01", replied = null as string | null, personalised = false } = {},
) {
  const [{ id }] = await query<{ id: number }>(
    `INSERT INTO letters (kind, notable_person_id, status, created_at, sent_at, replied_at)
     VALUES ('pauseai', $1, $2, $3, CASE WHEN $2 = 'not_sent' THEN NULL ELSE $3::timestamptz END, $4) RETURNING id::int AS id`,
    [politicianId, status, sent, replied],
  );
  await query(
    `INSERT INTO letters_from_pauseai (id, mailing_id, personalised)
     SELECT $1, id, $3 FROM mailings WHERE title = $2`,
    [id, title, personalised],
  );
  return id;
}

const EDINBURGH = "Edinburgh Conference Nov 26 Invitation";
const CSRB = "CSRB Iqbal Amendment";

describeWithDatabase("mailings", () => {
  useTestDatabase();

  it("lists every mailing, newest sent first, those unsent at the top, with each count", async () => {
    const polly = await addTestPolitician();
    const dora = await addTestPolitician({ name: "Dora Dummy", airtableId: "recDora" });
    const rob = await addTestPolitician({ name: "Rob Example", airtableId: "recRob" });
    await addLetter(EDINBURGH, polly, { sent: "2026-10-02", replied: "2026-10-04", personalised: true });
    await addLetter(EDINBURGH, dora, { sent: "2026-10-01", status: "bounced" });
    await addLetter(EDINBURGH, rob, { status: "not_sent" });
    await addLetter(CSRB, polly, { sent: "2026-06-01" });

    const mailings = await listMailings();
    // The unsent first, the newest made first.
    expect(mailings.map((m) => [m.title, m.sent, m.skipped, m.bounced, m.replied])).toEqual([
      ["DeepMind letter", 0, 0, 0, 0],
      ["Westminster Hall Debate Invitation", 0, 0, 0, 0],
      ["Documentary Invitation", 0, 0, 0, 0],
      ["Ben Lake October 2026 Debate", 0, 0, 0, 0],
      [EDINBURGH, 2, 1, 1, 1],
      [CSRB, 1, 0, 0, 0],
    ]);
    expect(mailings[4]).toMatchObject({
      ask: "edinburgh-conference-2026",
      askTitle: "Edinburgh conference",
      imported: true,
      sentAt: new Date("2026-10-01"),
    });
    expect(mailings[1]).toMatchObject({ ask: null, askTitle: null, sentAt: null });
    // One found by when its emails were sent is imported too, and its ask is the DeepMind letter.
    expect(mailings[0]).toMatchObject({ ask: "deepmind-letter", imported: true, sentAt: null });
  });

  it("gives one mailing with each recipient's outcome, by name; or nothing for no such mailing", async () => {
    const polly = await addTestPolitician();
    const dora = await addTestPolitician({ name: "Dora Dummy", airtableId: "recDora" });
    const letter = await addLetter(EDINBURGH, polly, { replied: "2026-10-04", personalised: true });
    await addLetter(EDINBURGH, dora, { status: "bounced" });
    const [{ id }] = await query<{ id: number }>("SELECT id::int AS id FROM mailings WHERE title = $1", [EDINBURGH]);

    const mailing = (await getMailing(id))!;
    expect(mailing.title).toBe(EDINBURGH);
    expect(mailing.recipients).toEqual([
      expect.objectContaining({ name: "Dora Dummy", politicianId: dora, status: "bounced", repliedAt: null }),
      {
        letterId: letter,
        politicianId: polly,
        name: "Polly Placeholder",
        status: "sent",
        sentAt: new Date("2026-10-01"),
        repliedAt: new Date("2026-10-04"),
        personalised: true,
        answer: null,
        skipReason: null,
      },
    ]);
    expect(mailing).toMatchObject({ recipientsTotal: 2, page: 1, pages: 1, pageSize: 100 });
    // A page past the last has no one on it, and the same count.
    expect(await getMailing(id, 2)).toMatchObject({ recipients: [], recipientsTotal: 2, page: 2 });
    expect(await getMailing(9999)).toBeUndefined();
    // Its title alone, for its page's title.
    expect(await mailingTitle(id)).toBe(EDINBURGH);
    expect(await mailingTitle(9999)).toBeUndefined();
  });

  it("lists a tab of the recipients: those who replied, bounced or were skipped, with their answer to its ask", async () => {
    const polly = await addTestPolitician();
    const dora = await addTestPolitician({ name: "Dora Dummy", airtableId: "recDora" });
    const rob = await addTestPolitician({ name: "Rob Example", airtableId: "recRob" });
    await addLetter(EDINBURGH, polly, { replied: "2026-10-04" });
    await addLetter(EDINBURGH, dora, { status: "bounced" });
    const skipped = await addLetter(EDINBURGH, rob, { status: "not_sent" });
    await query("UPDATE letters_from_pauseai SET skip_reason = 'left-office' WHERE id = $1", [skipped]);
    await query(
      `INSERT INTO ask_statuses (notable_person_id, ask, ask_kind, status, updated_by) VALUES ($1, 'edinburgh-conference-2026', 'event', 'going', 'staff')`,
      [polly],
    );
    const [{ id }] = await query<{ id: number }>("SELECT id::int AS id FROM mailings WHERE title = $1", [EDINBURGH]);
    const names = async (tab: "replied" | "bounced" | "skipped") =>
      (await getMailing(id, 1, tab))!.recipients.map((r) => [r.name, r.answer, r.skipReason]);
    expect(await names("replied")).toEqual([["Polly Placeholder", "going", null]]);
    expect(await names("bounced")).toEqual([["Dora Dummy", null, null]]);
    expect(await names("skipped")).toEqual([["Rob Example", null, "left-office"]]);
    expect(await getMailing(id, 1, "bounced")).toMatchObject({
      tab: "bounced",
      recipientsTotal: 1,
      to: 3,
      answered: 1,
    });
  });

  it("puts the mailings in three parts: drafts, those coming up, and the rest", async () => {
    await addTestPolitician({ house: "lords" });
    await addTestPolitician({ name: "Dora Dummy", airtableId: "recDora" });
    const lords = await createDraft(
      "jo@pauseai.uk",
      { list: "politicians", params: { house: "lords" } },
      { subject: "Lords" },
    );
    const all = await createDraft("jo@pauseai.uk", { list: "politicians", params: {} }, { subject: "Everyone" });
    await saveDraft(lords.id, 1, { subject: "To the Lords" });
    const later = await createDraft("jo@pauseai.uk", { list: "politicians", params: {} }, { subject: "Later" });
    const sooner = await createDraft("jo@pauseai.uk", { list: "politicians", params: {} }, { subject: "Sooner" });
    await query(
      "UPDATE mailings SET state = 'scheduled', due_at = '2026-12-01', sent_from = 'jo@pauseai.uk', from_name = 'Jo' WHERE id = $1",
      [later.id],
    );
    await query(
      "UPDATE mailings SET state = 'sending', due_at = '2026-11-01', sent_from = 'jo@pauseai.uk', from_name = 'Jo' WHERE id = $1",
      [sooner.id],
    );

    const { drafts, comingUp, sent } = await mailingsOverview();
    // The newest edited first, each with how many its filter finds now.
    expect(drafts.map((m) => [m.title, m.to, m.state, m.createdBy])).toEqual([
      ["To the Lords", 1, "draft", "jo@pauseai.uk"],
      ["Everyone", 2, "draft", "jo@pauseai.uk"],
    ]);
    expect(drafts[1].id).toBe(all.id);
    expect(comingUp.map((m) => m.title)).toEqual(["Sooner", "Later"]);
    expect(sent.map((m) => m.title)).toContain(EDINBURGH);
    expect(sent.map((m) => m.state)).not.toContain("draft");
    // The list for the download leaves the drafts out.
    expect((await listMailings()).map((m) => m.title)).not.toContain("Everyone");
  });
});
