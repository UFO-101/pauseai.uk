import { expect, it } from "vitest";
import { migrate } from "@/scripts/db-migrate.mjs";
import { campaigns } from "@/lib/content/email-your-mp";
import { addTestPolitician, describeWithDatabase, useDatabaseUpTo, useTestDatabase } from "@/tests/database";
import { asksWithCounts, listAsks, listCampaigns } from "./asks";
import { query } from "./db";
import { setStatus } from "./politicians";

describeWithDatabase("asks and campaigns", () => {
  useTestDatabase();

  it("lists every ask, newest first, those without a date last", async () => {
    const asks = await listAsks();
    expect(asks[0]).toEqual({
      slug: "go-to-parliament-oct-2026",
      title: expect.any(String),
      kind: "event",
      date: "2026-10-20",
    });
    expect(asks.map((ask) => ask.slug).sort()).toEqual(
      [
        "controlai-statement",
        "deepmind-letter",
        "edinburgh-conference-2026",
        "frontier-ai-letter",
        "go-to-parliament-oct-2026",
      ].sort(),
    );
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

describeWithDatabase("migration 0034_notable_people_and_asks", () => {
  const db = useDatabaseUpTo("0033");

  it("moves politicians, letters and statuses into the new tables, keeping their IDs", async () => {
    const [{ id: mp }] = await query<{ id: number }>(
      `INSERT INTO politicians (airtable_id, house, name, salutation, constituency, party, email)
       VALUES ('rec1', 'commons', 'Polly Placeholder', 'Ms Placeholder', 'Westminster', 'Labour', 'polly@example.org')
       RETURNING id::int AS id`,
    );
    const [{ id: gone }] = await query<{ id: number }>(
      `INSERT INTO politicians (airtable_id, house, name, sitting) VALUES ('rec2', 'commons', 'Gordon Gone', false)
       RETURNING id::int AS id`,
    );
    await query(
      `INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode,
         contact_consent, subject, reply_hash, status)
       VALUES ('regulate-letter-pm', $1, 'Jane', 'jane@example.com', '1 High St', 'SW1A 1AA', true, 'S', 'jane.1', 'sent'),
              ('an-old-campaign', $1, 'Sam', 'sam@example.com', '2 High St', 'SW1A 1AA', false, 'T', 'sam.2', 'sent')`,
      [mp],
    );
    await query("INSERT INTO supporters DEFAULT VALUES");
    await query(
      "INSERT INTO supporter_links (supporter_id, letter_id, matched_by, matched_value) VALUES (1, 1, 'email', 'jane@example.com')",
    );
    // Under both slugs the letter to the PM has had, so one status is kept: the newer.
    await query(
      `INSERT INTO campaign_statuses (politician_id, campaign, status, updated_by, updated_at, note) VALUES
         ($1, 'letter-to-the-prime-minister', 'signed', 'jo@pauseai.uk', '2026-10-01', 'older'),
         ($1, 'regulate-letter-pm', 'signed', 'jo@pauseai.uk', '2026-10-02', 'newer'),
         ($1, 'support-sobel-bill', 'signed', 'controlai', '2026-10-03', ''),
         ($2, 'a-mystery', 'signed', 'jo@pauseai.uk', '2026-10-04', '')`,
      [mp, gone],
    );

    expect(migrate(db.url, { appliedUpTo: "0033" })).toContain("0034_notable_people_and_asks");

    expect(
      await query(
        `SELECT n.id::int AS id, n.kind, n.name, n.status, n.airtable_id AS "airtableId", p.house, p.constituency
         FROM notable_people n JOIN politicians p USING (id) ORDER BY n.id`,
      ),
    ).toEqual([
      {
        id: mp,
        kind: "politician",
        name: "Polly Placeholder",
        status: "in_office",
        airtableId: "rec1",
        house: "commons",
        constituency: "Westminster",
      },
      {
        id: gone,
        kind: "politician",
        name: "Gordon Gone",
        status: "left_office",
        airtableId: "rec2",
        house: "commons",
        constituency: null,
      },
    ]);
    expect(
      await query(
        `SELECT l.id::int AS id, l.kind, l.notable_person_id::int AS "personId", s.campaign, s.sender_email AS email
         FROM letters l JOIN supporter_letters s USING (id) ORDER BY l.id`,
      ),
    ).toEqual([
      { id: 1, kind: "supporter", personId: mp, campaign: "regulate-letter-pm", email: "jane@example.com" },
      { id: 2, kind: "supporter", personId: mp, campaign: "an-old-campaign", email: "sam@example.com" },
    ]);
    expect(await query("SELECT slug, title, ask FROM campaigns WHERE slug = 'an-old-campaign'")).toEqual([
      { slug: "an-old-campaign", title: "an-old-campaign", ask: null },
    ]);
    expect(
      await query(
        `SELECT notable_person_id::int AS id, ask, status, note, updated_by AS "updatedBy"
         FROM ask_statuses ORDER BY notable_person_id, ask`,
      ),
    ).toEqual([
      { id: mp, ask: "controlai-statement", status: "signed", note: "", updatedBy: "controlai" },
      { id: mp, ask: "frontier-ai-letter", status: "signed", note: "newer", updatedBy: "jo@pauseai.uk" },
      { id: gone, ask: "a-mystery", status: "signed", note: "", updatedBy: "jo@pauseai.uk" },
    ]);
    // The supporter views read the sender from their new table.
    expect(await query("SELECT name, emails, letters FROM supporters_summary")).toEqual([
      { name: "Jane", emails: ["jane@example.com"], letters: 1 },
    ]);
    expect(
      await query(
        "SELECT topic, address, send FROM email_permissions WHERE topic = 'events-and-ways-to-help' ORDER BY 2",
      ),
    ).toEqual([
      { topic: "events-and-ways-to-help", address: "jane@example.com", send: "yes" },
      { topic: "events-and-ways-to-help", address: "sam@example.com", send: "no" },
    ]);
    // A new politician gets the next ID.
    const [{ id }] = await query<{ id: number }>(
      "INSERT INTO notable_people (kind, name) VALUES ('politician', 'Nina New') RETURNING id::int AS id",
    );
    expect(id).toBe(gone + 1);
  });
});
