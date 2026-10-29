import { expect, it } from "vitest";
import { addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { createDraft, saveDraft } from "./mailing-drafts";
import { mailingPageData, newMailingData } from "./mailing-pages";

describeWithDatabase("the mailing pages' data", () => {
  useTestDatabase();

  it("gives a new mailing who it goes to, what its letter can use, and who it can be from", async () => {
    const polly = await addTestPolitician();
    await addTestPolitician({ name: "Ned Noaddress", airtableId: "rec2", email: null });
    await query("INSERT INTO staff_accounts (email, added_by) VALUES ('jo@pauseai.uk', 'admin@pauseai.uk')");
    const data = await newMailingData({ house: "commons", party: "Gone Party", sort: "name" }, "jo@pauseai.uk");
    expect(data.filter).toEqual({ list: "politicians", params: { house: "commons", party: "Gone Party" } });
    expect(data.unknown).toEqual(["party=Gone Party"]);
    expect(data.senders).toEqual(["jo@pauseai.uk"]);
    expect(data.sends).toBe(false);
    expect(data.me).toBe("jo@pauseai.uk");
    const all = await newMailingData({}, "jo@pauseai.uk");
    expect(all.recipients).toEqual([
      expect.objectContaining({ id: polly, name: "Polly Placeholder", email: "polly.placeholder.mp@parliament.uk" }),
    ]);
    expect(all.leftOut).toEqual([expect.objectContaining({ name: "Ned Noaddress", reason: "no-address" })]);
    expect(all.fields.map((field) => field.id)).toContain("salutation");
  });

  it("gives a draft to write, an imported mailing, one written and scheduled with a tab, or nothing", async () => {
    await addTestPolitician();
    const { id } = await createDraft("jo@pauseai.uk", { list: "politicians", params: {} }, { subject: "Hi" });
    await query("UPDATE mailings SET opened_at = now() - interval '2 days' WHERE id = $1", [id]);
    const draft = (await mailingPageData(id, {}, "jo@pauseai.uk"))!;
    expect(draft).toMatchObject({ kind: "draft", draft: { id, subject: "Hi" } });
    // Opening it keeps it.
    expect(
      await query("SELECT 1 FROM mailings WHERE id = $1 AND opened_at > now() - interval '1 hour'", [id]),
    ).toHaveLength(1);

    const [imported] = await query<{ id: number }>("SELECT id::int AS id FROM mailings WHERE body IS NULL LIMIT 1");
    expect(await mailingPageData(imported.id, { tab: "nonsense" }, "jo@pauseai.uk")).toMatchObject({
      kind: "imported",
      mailing: { tab: "all" },
    });

    await saveDraft(id, 1, { sentFrom: "jo@pauseai.uk", fromName: "Jo", dueAt: "2099-01-01T09:00:00Z" });
    await query("UPDATE mailings SET state = 'scheduled' WHERE id = $1", [id]);
    expect(await mailingPageData(id, { tab: "bounced", page: "2" }, "jo@pauseai.uk")).toMatchObject({
      kind: "written",
      mailing: { tab: "bounced", page: 2 },
      written: { state: "scheduled" },
      filter: { list: "politicians", params: {} },
    });
    expect(await mailingPageData(9999, {}, "jo@pauseai.uk")).toBeUndefined();
  });
});
