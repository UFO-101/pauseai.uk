import { beforeEach, expect, it } from "vitest";
import { FIXED_ASKS } from "@/lib/asks";
import { campaigns, copy } from "@/lib/content/email-your-mp";
import { addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { addAsk, askToEdit, asksWithCounts, deleteAsk, editAsk, listAsks, listCampaigns } from "./asks";
import { query } from "./db";
import { setStatus } from "./politicians";

describeWithDatabase("asks and campaigns", () => {
  useTestDatabase();

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
