import { beforeEach, expect, it } from "vitest";
import { FIXED_ASKS } from "@/lib/asks";
import { campaigns, copy } from "@/lib/content/email-your-mp";
import { migrate } from "@/scripts/db-migrate.mjs";
import {
  addTestPolitician,
  describeWithDatabase,
  MAKES_DATABASES,
  useDatabaseUpTo,
  useTestDatabase,
} from "@/tests/database";
import { addAsk, askPageData, askToEdit, asksWithCounts, deleteAsk, editAsk, listAsks, listCampaigns } from "./asks";
import { query } from "./db";
import { setStatus } from "./politicians";

describeWithDatabase("asks and campaigns", () => {
  useTestDatabase();

  it("gives an ask's page: its counts, its campaigns and mailings by date, and its answers by status", async () => {
    const polly = await addTestPolitician();
    const dora = await addTestPolitician({ name: "Dora", email: "dora@parliament.uk", airtableId: "dora" });
    await setStatus(polly, "deepmind-letter", { status: "signed", date: null, note: "" }, "test");
    await setStatus(dora, "deepmind-letter", { status: "declined", date: null, note: "" }, "test");
    const [{ id }] = await query<{ id: number }>(
      `INSERT INTO letters (kind, notable_person_id, status, sent_at) VALUES ('pauseai', $1, 'sent', '2025-07-01') RETURNING id::int AS id`,
      [polly],
    );
    await query(
      `INSERT INTO letters_from_pauseai (id, mailing_id) SELECT $1, id FROM mailings WHERE ask = 'deepmind-letter' LIMIT 1`,
      [id],
    );
    const ask = await askPageData("deepmind-letter");
    expect(ask).toMatchObject({ fixed: true, writtenTo: 1, noAnswer: 0, counts: { signed: 1, declined: 1 } });
    expect(ask!.mailings).toBeGreaterThan(0);
    expect(ask!.campaigns).toBeGreaterThan(0);
    // Campaigns first, then mailings, the latest of each first.
    expect(ask!.ways.map((way) => way.kind)).toEqual([...ask!.ways.map((way) => way.kind)].sort());
    expect(ask!.ways.find((way) => way.letters === 1)).toMatchObject({ kind: "mailing" });
    // With no answer chosen, a column each, and no page of answers.
    expect(ask!.groups.map((g) => [g.key, g.total, g.people.map((p) => p.politicianId)])).toEqual([
      ["signed", 1, [polly]],
      ["declined", 1, [dora]],
    ]);
    expect(ask).toMatchObject({ answers: [], answersTotal: 0, pages: 1 });
    expect(ask!.groups[0].people[0].lastWrittenTo).not.toBeNull();
    expect(ask!.groups[1].people[0].lastWrittenTo).toBeNull();
    // With one chosen, a page of those who gave it, and the columns' counts without their people.
    const signed = (await askPageData("deepmind-letter", "signed"))!;
    expect(signed.answers.map((a) => a.politicianId)).toEqual([polly]);
    expect(signed).toMatchObject({ answersTotal: 1, pages: 1 });
    expect(signed.groups.map((g) => [g.key, g.total, g.people])).toEqual([
      ["signed", 1, []],
      ["declined", 1, []],
    ]);
    // An answer it has no column for finds nobody.
    expect((await askPageData("deepmind-letter", "going"))!.answers).toEqual([]);
    const write = async (person: number, sentAt: string) => {
      const [{ id: letter }] = await query<{ id: number }>(
        `INSERT INTO letters (kind, notable_person_id, status, sent_at) VALUES ('pauseai', $1, 'sent', $2) RETURNING id::int AS id`,
        [person, sentAt],
      );
      await query(
        `INSERT INTO letters_from_pauseai (id, mailing_id) SELECT $1, id FROM mailings WHERE ask = 'deepmind-letter' LIMIT 1`,
        [letter],
      );
    };
    const newer = await addTestPolitician({ name: "Newer", email: "newer@parliament.uk", airtableId: "newer" });
    const older = await addTestPolitician({ name: "Older", email: "older@parliament.uk", airtableId: "older" });
    await addTestPolitician({ name: "Unwritten", email: "unwritten@parliament.uk", airtableId: "unwritten" });
    await write(newer, "2025-08-02");
    await write(older, "2025-08-01");
    // Those written to with no answer: only someone written to counts, and only until they answer, oldest first.
    const none = (await askPageData("deepmind-letter", "none"))!;
    expect(none).toMatchObject({ answersTotal: 2, noAnswer: 2, page: 1, pages: 1 });
    expect((await askPageData("deepmind-letter", "none", 2))!.answers).toEqual([]);
    expect(none.answers.map((a) => [a.politicianId, a.status])).toEqual([
      [older, null],
      [newer, null],
    ]);
    expect((await asksWithCounts()).find((a) => a.slug === "deepmind-letter")!.noAnswer).toBe(2);
    expect((await askPageData("deepmind-letter"))!.groups.at(-1)).toMatchObject({ key: "none", total: 2 });
    expect(await askPageData("no-such-ask")).toBeUndefined();
    await addAsk({ title: "Ours", kind: "letter", date: null, url: null, askedBy: [] }, "jo@pauseai.uk");
    expect((await askPageData("ours"))!.fixed).toBe(false);
    await deleteAsk("ours", "jo@pauseai.uk");
  });

  it("sets an event's answers in its columns, the rarer ones together", async () => {
    const polly = await addTestPolitician();
    const dora = await addTestPolitician({ name: "Dora", email: "dora@parliament.uk", airtableId: "dora" });
    const edinburgh = "edinburgh-conference-2026";
    await setStatus(polly, edinburgh, { status: "tentative", date: null, note: "" }, "test");
    await setStatus(dora, edinburgh, { status: "declined_surgery", date: null, note: "" }, "test");
    const ask = await askPageData(edinburgh);
    expect(ask!.groups.map((g) => [g.key, g.total, g.people.map((p) => p.status)])).toEqual([
      ["going", 0, []],
      ["other", 1, ["tentative"]],
      ["declined", 1, ["declined_surgery"]],
    ]);
    const other = await askPageData(edinburgh, "other");
    expect(other!.answers.map((a) => a.politicianId)).toEqual([polly]);
    expect(other!.answersTotal).toBe(1);
  });

  it("lists every ask, newest first, those without a date last", async () => {
    const asks = await listAsks();
    expect(asks.map((ask) => [ask.slug, ask.date])).toEqual([
      ["edinburgh-conference-2026", "2026-11-01"],
      ["go-to-parliament-oct-2026", "2026-10-20"],
      ["controlai-letter", "2026-09-11"],
      ["frontier-ai-letter", "2026-06-18"],
      ["deepmind-letter", "2025-08-29"],
      ["controlai-statement", "2025-02-06"],
    ]);
    expect(asks[0]).toEqual({
      slug: "edinburgh-conference-2026",
      title: expect.any(String),
      kind: "event",
      date: "2026-11-01",
      url: "https://luma.com/6jp2nqe9",
      askedBy: ["pauseai"],
    });
    expect(asks.map((ask) => ask.slug).sort()).toEqual(
      [
        "controlai-letter",
        "controlai-statement",
        "deepmind-letter",
        "edinburgh-conference-2026",
        "frontier-ai-letter",
        "go-to-parliament-oct-2026",
      ].sort(),
    );
  });

  it("names the test MPs' asks by their titles here", async () => {
    const titles = Object.fromEntries((await listAsks()).map((ask) => [ask.slug, ask.title]));
    for (const [ask, title] of Object.entries(copy.lookup.testMpAsks)) expect(titles[ask]).toBe(title);
  });

  it("counts each ask's answers", async () => {
    const polly = await addTestPolitician();
    const dora = await addTestPolitician({ airtableId: "rec2", name: "Dora Dummy" });
    await setStatus(polly, "edinburgh-conference-2026", { status: "declined", date: null, note: "" }, "airtable");
    await setStatus(dora, "edinburgh-conference-2026", { status: "declined", date: null, note: "" }, "airtable");
    await setStatus(dora, "frontier-ai-letter", { status: "signed", date: null, note: "" }, "jo@pauseai.uk");
    const counts = Object.fromEntries((await asksWithCounts()).map((ask) => [ask.slug, ask.counts]));
    expect(counts["edinburgh-conference-2026"]).toEqual({ declined: 2 });
    expect(counts["frontier-ai-letter"]).toEqual({ signed: 1 });
    expect(counts["deepmind-letter"]).toEqual({});
    // Who asks each, as the migration sets it.
    const by = Object.fromEntries((await asksWithCounts()).map((ask) => [ask.slug, ask.askedBy]));
    expect(by).toEqual({
      "frontier-ai-letter": ["supporters"],
      "deepmind-letter": ["supporters"],
      "controlai-statement": ["controlai"],
      "controlai-letter": ["controlai"],
      "edinburgh-conference-2026": ["pauseai"],
      "go-to-parliament-oct-2026": ["supporters"],
    });
  });

  it("has a row for every campaign in code, with its title and ask", async () => {
    const rows = await listCampaigns();
    for (const campaign of campaigns) {
      expect(rows).toContainEqual({ slug: campaign.slug, title: campaign.title, ask: campaign.ask ?? null });
    }
    // And pauseai.info's old campaigns, which have no code.
    expect(rows.map((row) => row.slug)).toEqual(
      expect.arrayContaining(["pauseai-info-frontier-ai", "pauseai-info-liability", "pauseai-info-deepmind"]),
    );
  });
});

describeWithDatabase("staff's asks", () => {
  useTestDatabase();
  // The asks the migrations add stay; those a test added go.
  beforeEach(() => query("DELETE FROM asks WHERE slug <> ALL($1)", [FIXED_ASKS]));
  const JO = "jo@pauseai.uk";
  const RECEPTION = {
    title: "Winter reception",
    kind: "event" as const,
    date: "2026-12-09",
    url: null,
    askedBy: ["pauseai" as const],
  };
  const audit = () => query("SELECT actor, action, details FROM audit_log ORDER BY id");

  it("adds an ask, its slug from its title and month, numbered if it's taken, and logs it", async () => {
    expect(await addAsk(RECEPTION, JO)).toEqual({ saved: true, slug: "winter-reception-dec-2026" });
    expect(await addAsk(RECEPTION, JO)).toEqual({ saved: true, slug: "winter-reception-dec-2026-2" });
    expect(await addAsk(RECEPTION, JO)).toEqual({ saved: true, slug: "winter-reception-dec-2026-3" });
    expect(await askToEdit("winter-reception-dec-2026")).toEqual({
      slug: "winter-reception-dec-2026",
      ...RECEPTION,
      fixed: false,
      kindFixed: false,
      deletable: true,
    });
    expect((await audit())[0]).toEqual({
      actor: JO,
      action: "add ask",
      details: { slug: "winter-reception-dec-2026", ...RECEPTION },
    });
  });

  it("changes an ask but its slug; its kind only while no one has answered it; never one the code names", async () => {
    await addAsk(RECEPTION, JO);
    const slug = "winter-reception-dec-2026";
    expect(await editAsk(slug, { ...RECEPTION, title: "Reception", url: "https://luma.com/x" }, JO)).toEqual({
      saved: true,
      slug,
    });
    expect(await askToEdit(slug)).toMatchObject({ slug, title: "Reception", url: "https://luma.com/x" });
    const polly = await addTestPolitician();
    await setStatus(polly, slug, { status: "going", date: null, note: "" }, JO);
    expect(await editAsk(slug, { ...RECEPTION, kind: "letter" }, JO)).toEqual({ saved: false, reason: "kind-in-use" });
    expect(await askToEdit(slug)).toMatchObject({ kindFixed: true, deletable: false });
    expect(await editAsk(slug, { ...RECEPTION, title: "Reception again" }, JO)).toMatchObject({ saved: true });
    expect(await editAsk("frontier-ai-letter", RECEPTION, JO)).toEqual({ saved: false, reason: "fixed" });
    expect(await editAsk("nothing", RECEPTION, JO)).toEqual({ saved: false, reason: "gone" });
    expect(await askToEdit("frontier-ai-letter")).toMatchObject({ fixed: true, deletable: false });
    expect(await askToEdit("nothing")).toBeUndefined();
  });

  it("deletes an ask nothing refers to, logging what it was; not one answered, in a mailing, or the code's", async () => {
    await addAsk(RECEPTION, JO);
    await addAsk({ ...RECEPTION, title: "Mailed" }, JO);
    await query(
      `INSERT INTO mailings (title, ask, audience, channel, state, airtable_sent_between)
       VALUES ('M', 'mailed-dec-2026', 'politicians', 'email', 'sent', '[2026-01-01,2026-01-02)')`,
    );
    expect(await deleteAsk("mailed-dec-2026", JO)).toEqual({ saved: false, reason: "in-use" });
    expect(await deleteAsk("frontier-ai-letter", JO)).toEqual({ saved: false, reason: "fixed" });
    expect(await deleteAsk("nothing", JO)).toEqual({ saved: false, reason: "gone" });
    expect(await deleteAsk("winter-reception-dec-2026", JO)).toEqual({
      saved: true,
      slug: "winter-reception-dec-2026",
    });
    expect(await askToEdit("winter-reception-dec-2026")).toBeUndefined();
    expect((await audit()).at(-1)).toEqual({
      actor: JO,
      action: "delete ask",
      details: { slug: "winter-reception-dec-2026", ...RECEPTION },
    });
  });
});

describeWithDatabase("migration 0061_ask_links_whole", MAKES_DATABASES, () => {
  const db = useDatabaseUpTo("0060");

  it("puts the site's address in front of an ask's link that's a path of it, and leaves whole links alone", async () => {
    expect(migrate(db.url, { appliedUpTo: "0060" })).toContain("0061_ask_links_whole");
    expect(
      await query(
        "SELECT slug, url FROM asks WHERE slug IN ('frontier-ai-letter', 'deepmind-letter', 'controlai-letter') ORDER BY slug",
      ),
    ).toEqual([
      { slug: "controlai-letter", url: "https://controlai.org/uk-pm-letter" },
      { slug: "deepmind-letter", url: "https://pauseai.uk/campaigns/dear-sir-demis-2025" },
      { slug: "frontier-ai-letter", url: "https://pauseai.uk/pdfs/Frontier-AI-Open-Letter.pdf" },
    ]);
  });
});
