import { LETTERS_INBOX } from "@/tests/gmail-sends";
import { expect, it } from "vitest";
import { afterEach, vi } from "vitest";
import { addTestPolitician, connectTestGmail, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { GMAIL_DAILY_LIMIT } from "./gmail-accounts";
import { query } from "./db";
import { createDraft, saveDraft } from "./mailing-drafts";
import { mailingPageData, politiciansPageData, type MailingPageData } from "./mailing-pages";

describeWithDatabase("the mailing pages' data", () => {
  useTestDatabase();
  afterEach(() => vi.unstubAllEnvs());

  it("gives a draft who it goes to, what its letter can use, who it can be from, and the names of those ticked", async () => {
    const polly = await addTestPolitician();
    const ned = await addTestPolitician({ name: "Ned Noaddress", airtableId: "rec2", email: null });
    await query(
      "INSERT INTO staff_accounts (email, added_by) VALUES ('samuel.whitlock@pauseai.uk', 'admin@pauseai.uk')",
    );
    await connectTestGmail("jo@pauseai.uk");
    // The letters inbox is connected too, but never offered.
    await connectTestGmail(LETTERS_INBOX);
    const filtered = await createDraft(
      "jo@pauseai.uk",
      { list: "politicians", params: { house: "commons", party: "Gone Party" } },
      {},
    );
    const data = (await mailingPageData(filtered.id, {}, "jo@pauseai.uk")) as Extract<
      MailingPageData,
      { kind: "draft" }
    >;
    expect(data.filter).toEqual({ list: "politicians", params: { house: "commons", party: "Gone Party" } });
    expect(data.unknown).toEqual(["party=Gone Party"]);
    expect(data.names).toEqual({});
    // The connected accounts, with what each has left today.
    expect(data.senders).toEqual([
      { email: "jo@pauseai.uk", name: "", connectedAt: expect.any(Date), sentToday: 0, remaining: GMAIL_DAILY_LIMIT },
    ]);
    expect(data.sends).toBe(true);
    expect(data.me).toBe("jo@pauseai.uk");
    const picked = {
      ids: [polly, ned],
      from: { params: { house: "commons" }, at: "2026-11-03T10:00:00.000Z", found: [polly] },
    };
    const ticked = await createDraft("jo@pauseai.uk", { list: "politicians", params: {}, picked }, {});
    const all = (await mailingPageData(ticked.id, {}, "jo@pauseai.uk")) as Extract<MailingPageData, { kind: "draft" }>;
    expect(all.recipients).toEqual([
      expect.objectContaining({ id: polly, name: "Polly Placeholder", email: "polly.placeholder.mp@parliament.uk" }),
    ]);
    expect(all.leftOut).toEqual([expect.objectContaining({ name: "Ned Noaddress", reason: "no-address" })]);
    expect(all.fields.map((field) => field.id)).toContain("salutation");
    expect(all.names).toEqual({ [polly]: "Polly Placeholder", [ned]: "Ned Noaddress" });
  });

  it("gives the politicians page, and while it's choosing for a draft, who's ticked and the lines pasted", async () => {
    const polly = await addTestPolitician();
    const lord = await addTestPolitician({
      name: "Lord Sample",
      airtableId: "rec2",
      house: "lords",
      constituency: null,
      email: "lord.sample@example.org",
    });
    const plain = await politiciansPageData({ house: "commons", mailing: "999999", pasted: ["Polly Placeholder"] });
    expect(plain).toMatchObject({ choosing: undefined, filtersHidden: false, tickedHere: 0 });
    expect(plain.pasted).toEqual({ lines: [], skipped: 0 });
    expect(plain.list.politicians.map((p) => p.id)).toEqual([polly]);
    const { id } = await createDraft("jo@pauseai.uk", { list: "politicians", params: {}, picked: { ids: [lord] } }, {});
    const choosing = await politiciansPageData({
      house: "commons",
      mailing: String(id),
      pasted: ["Polly Placeholder", "Labour"],
    });
    expect(choosing).toMatchObject({ choosing: { id, ticked: [lord] }, filtersHidden: false, tickedHere: 0 });
    expect(choosing.pasted).toEqual({
      lines: [
        expect.objectContaining({ line: "Polly Placeholder", matches: [expect.objectContaining({ id: polly })] }),
      ],
      skipped: 1,
    });
    // The ticked tab: those ticked, whatever the filters, which are hidden; on the pasted tab too.
    const ticked = await politiciansPageData({ house: "commons", mailing: String(id), tab: "ticked" });
    expect(ticked.filtersHidden).toBe(true);
    expect(ticked.list.politicians.map((p) => p.id)).toEqual([lord]);
    const pastedTab = await politiciansPageData({ house: "commons", mailing: String(id), tab: "pasted" });
    expect(pastedTab.filtersHidden).toBe(true);
    expect(pastedTab.list.politicians.map((p) => p.id)).toEqual([polly]);
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
    expect(await mailingPageData(id, { tab: "failed", page: "2" }, "jo@pauseai.uk")).toMatchObject({
      kind: "written",
      mailing: { tab: "failed", page: 2 },
      written: { state: "scheduled" },
      filter: { list: "politicians", params: {} },
      names: {},
    });
    expect(await mailingPageData(9999, {}, "jo@pauseai.uk")).toBeUndefined();
  });
});
