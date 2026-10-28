import { expect, it } from "vitest";
import { addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { getMailing, listMailings } from "./mailings";

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
    `INSERT INTO pauseai_letters (id, mailing_id, personalised)
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
      },
    ]);
    expect(await getMailing(9999)).toBeUndefined();
  });
});
