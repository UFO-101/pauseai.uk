import { expect, it } from "vitest";
import { campaigns, copy } from "@/lib/content/email-your-mp";
import { addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { asksWithCounts, listAsks, listCampaigns } from "./asks";
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
