import { expect, it } from "vitest";
import { addTestLetter, addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { campaignVersions, getCampaignSummary, listCampaignSummaries } from "./campaigns";
import { query } from "./db";

describeWithDatabase("campaigns", () => {
  useTestDatabase();

  it("counts each campaign's letters, those that failed and were replied to, and who's answered its ask", async () => {
    const polly = await addTestPolitician();
    const dora = await addTestPolitician({ name: "Dora", email: "dora@parliament.uk", airtableId: "b" });
    const slug = "regulate-letter-pm";
    await addTestLetter({ politicianId: polly, campaign: slug, senderEmail: "a@example.com", createdAt: "2026-06-01" });
    await addTestLetter({
      politicianId: polly,
      campaign: slug,
      senderEmail: "A@example.com ",
      status: "bounced",
      createdAt: "2026-07-01",
    });
    await addTestLetter({
      politicianId: dora,
      campaign: slug,
      senderEmail: "b@example.com",
      repliedAt: "2026-08-01",
      createdAt: "2026-08-01",
    });
    await query(
      "INSERT INTO ask_statuses (notable_person_id, ask, ask_kind, status, updated_by) VALUES ($1, 'frontier-ai-letter', 'letter', 'signed', 'test')",
      [polly],
    );
    const campaign = await getCampaignSummary(slug);
    expect(campaign).toMatchObject({
      letters: 3,
      sent: 2,
      failed: 1,
      replied: 1,
      answered: 1,
      politicians: 2,
      supporters: 2,
      ask: "frontier-ai-letter",
      askKind: "letter",
    });
    expect(new Date(campaign!.firstAt!)).toEqual(new Date("2026-06-01"));
    expect(new Date(campaign!.lastAt!)).toEqual(new Date("2026-08-01"));
    expect(await getCampaignSummary("nope")).toBeUndefined();
    const all = await listCampaignSummaries();
    expect(all[0].slug).toBe(slug);
    expect(all.find((c) => c.slug === "support-sobel-bill")?.letters).toBe(0);
  });

  it("gives a site campaign its one text, with its names to fill in", async () => {
    const polly = await addTestPolitician();
    await addTestLetter({ politicianId: polly, campaign: "regulate-letter-pm" });
    const { versions } = await campaignVersions("regulate-letter-pm");
    expect(versions).toHaveLength(1);
    expect(versions[0]).toMatchObject({ key: "regulate-letter-pm", from: null, letters: 1 });
    expect(versions[0].text).toContain("{salutation}");
  });

  it("gives an old campaign each version live when its letters were written, newest first, and how much was their own", async () => {
    const polly = await addTestPolitician();
    const slug = "pauseai-info-frontier-ai";
    const letter = async (createdAt: string, own: number | null) => {
      const id = await addTestLetter({ politicianId: polly, campaign: slug, createdAt });
      if (own !== null) {
        await query(
          "UPDATE letters_from_supporters SET draft = 'x', draft_approximate = false, own_words = $2 WHERE id = $1",
          [id, own],
        );
      }
    };
    await letter("2026-06-20T12:00:00Z", 0);
    await letter("2026-06-21T12:00:00Z", 0.05);
    await letter("2026-10-01T12:00:00Z", 0.3);
    await letter("2026-10-02T12:00:00Z", 0.9);
    await letter("2026-10-03T12:00:00Z", null);
    const { versions, changed } = await campaignVersions(slug);
    expect(versions.map((v) => [v.key, v.letters])).toEqual([
      ["d9416004", 3],
      ["9dbb9d06", 2],
    ]);
    expect(changed).toBe(3);
    expect((await campaignVersions("no-such-campaign")).versions).toEqual([]);
  });
});
