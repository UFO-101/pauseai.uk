import { expect, it } from "vitest";
import { addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { politicianAudience } from "./mailing-recipients";

describeWithDatabase("politicianAudience", () => {
  useTestDatabase();

  it("goes to those with an address, by name, and leaves out those with none or a blocked one", async () => {
    const polly = await addTestPolitician({ name: "Polly Placeholder", airtableId: "rec1" });
    const dora = await addTestPolitician({
      name: "Dora Dummy",
      airtableId: "rec2",
      salutation: "",
      constituency: null,
      house: "lords",
      email: "dora@example.org",
    });
    const nobody = await addTestPolitician({ name: "Ned Noaddress", airtableId: "rec3", email: "  " });
    const bounced = await addTestPolitician({ name: "Bob Bounced", airtableId: "rec4", email: "Bob@Example.org" });
    await addTestPolitician({ name: "Lou Leftoffice", airtableId: "rec5", status: "left_office" });
    await query(
      `WITH p AS (INSERT INTO email_problems (address, kind, reason, can_reset) VALUES ('bob@example.org', 'hard', 'x', true) RETURNING id)
       INSERT INTO email_blocks (address, problem_id) SELECT 'bob@example.org', id FROM p`,
    );
    await query(
      `INSERT INTO ask_statuses (notable_person_id, ask, ask_kind, status, updated_by) VALUES
         ($1, 'frontier-ai-letter', 'letter', 'signed', 'staff'),
         ($2, 'frontier-ai-letter', 'letter', 'signed', 'staff'),
         ($2, 'edinburgh-conference-2026', 'event', 'declined', 'staff'),
         ($1, 'edinburgh-conference-2026', 'event', 'going', 'staff')`,
      [polly, dora],
    );

    const audience = await politicianAudience({ list: "politicians", params: {} });
    expect(audience.recipients.map((r) => [r.id, r.values, r.meets])).toEqual([
      [
        dora,
        { salutation: "", name: "Dora Dummy", constituency: "", party: "Labour (Co-op)", house: "House of Lords" },
        ["edinburgh-conference-2026:declined", "frontier-ai-letter:signed"],
      ],
      [
        polly,
        {
          salutation: "Ms Placeholder",
          name: "Polly Placeholder",
          constituency: "Cities of London and Westminster",
          party: "Labour (Co-op)",
          house: "House of Commons",
        },
        ["edinburgh-conference-2026:going", "frontier-ai-letter:signed"],
      ],
    ]);
    expect(audience.leftOut).toEqual([
      { id: bounced, name: "Bob Bounced", reason: "blocked" },
      { id: nobody, name: "Ned Noaddress", reason: "no-address" },
    ]);
    // Dora has no salutation or constituency.
    expect(audience.fields.map((f) => [f.id, f.lacking])).toEqual([
      ["salutation", 1],
      ["name", 0],
      ["constituency", 1],
      ["party", 0],
      ["house", 0],
    ]);
    // Each answer given, the asks newest first, each kind's answers in their order.
    expect(audience.conditions.map((c) => [c.id, c.covers])).toEqual([
      ["edinburgh-conference-2026:going", 1],
      ["edinburgh-conference-2026:declined", 1],
      ["frontier-ai-letter:signed", 2],
    ]);
    expect(audience.conditions[2].label).toContain("signed");
  });

  it("runs the stored filter, and finds no one with no address at all", async () => {
    await addTestPolitician({ name: "Polly Placeholder", airtableId: "rec1", house: "commons" });
    const lord = await addTestPolitician({ name: "Lord Test", airtableId: "rec2", house: "lords", email: null });
    const audience = await politicianAudience({ list: "politicians", params: { house: "lords" } });
    expect(audience.recipients).toEqual([]);
    expect(audience.leftOut).toEqual([{ id: lord, name: "Lord Test", reason: "no-address" }]);
    expect(audience.conditions).toEqual([]);
  });
});
