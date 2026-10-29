import { expect, it } from "vitest";
import { query } from "@/lib/server/db";
import { addTestLetter, addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { constituencyCounts } from "./constituency-counts";
import { linkSupporters } from "./supporters";

/** A member who gave a postcode, or only a town. */
async function member(id: string, postcode: string | null, city = "London") {
  await query(
    `INSERT INTO members (id, email, name, city, postcode, joined_at, created_at, keep_informed, share_permission, source_modified_at)
     VALUES ($1, $2, $1, $3, $4, '2026-09-01', '2026-09-01', true, true, '2026-09-01')`,
    [id, `${id}@example.com`, city, postcode],
  );
}

/** A postcode as postcodes.io placed it, in a constituency or none. */
async function postcode(code: string, constituency: string | null) {
  await query(
    `INSERT INTO postcode_places (postcode, latitude, longitude, place, country, constituency, constituency_checked)
     VALUES ($1, 51.5, -0.1, 'Somewhere', 'england', $2, true)`,
    [code, constituency],
  );
}

describeWithDatabase("constituencyCounts", () => {
  useTestDatabase(["members"]);

  it("counts supporters by their postcode's constituency, and sent letters by their MP's, in each campaign", async () => {
    await postcode("SW1A1AA", "Cities of London and Westminster");
    await postcode("M11AE", "Manchester Central");
    await postcode("ZZ11ZZ", null);
    await member("westminster-1", "sw1a 1aa");
    await member("westminster-2", "SW1A1AA");
    await member("manchester", "M1 1AE");
    await member("nowhere", "ZZ1 1ZZ");
    await member("town-only", null);
    await linkSupporters();

    const westminster = await addTestPolitician({ airtableId: "rec1", name: "Wes Minster MP" });
    await addTestPolitician({ airtableId: "rec2", name: "Manny Central MP", constituency: "Manchester Central" });
    await addTestPolitician({
      airtableId: "rec3",
      name: "Leeds Central MP",
      constituency: "Leeds Central and Headingley",
      party: "Green",
    });
    const retired = await addTestPolitician({ airtableId: "rec4", constituency: "Aldershot", status: "retired" });
    const peer = await addTestPolitician({ airtableId: "rec5", house: "lords", constituency: null });
    const misspelt = await addTestPolitician({ airtableId: "rec6", constituency: "Exampleshire North" });
    const test = await addTestPolitician({ airtableId: "rec7", constituency: "Testshire", testPostcode: "ZZ99ZZ" });
    await addTestLetter({ politicianId: westminster });
    await addTestLetter({ politicianId: westminster });
    await addTestLetter({ politicianId: westminster, campaign: "support-sobel-bill" });
    await addTestLetter({ politicianId: westminster, status: "bounced" });
    await addTestLetter({ politicianId: retired, campaign: "support-sobel-bill" });
    for (const politicianId of [peer, misspelt, test]) await addTestLetter({ politicianId });

    expect(await constituencyCounts()).toEqual([
      { code: "E14001063", supporters: 0, frontier: 0, sobel: 1, mp: null },
      {
        code: "E14001172",
        supporters: 2,
        frontier: 2,
        sobel: 1,
        mp: { name: "Wes Minster MP", party: "Labour (Co-op)" },
      },
      { code: "E14001319", supporters: 0, frontier: 0, sobel: 0, mp: { name: "Leeds Central MP", party: "Green" } },
      {
        code: "E14001352",
        supporters: 1,
        frontier: 0,
        sobel: 0,
        mp: { name: "Manny Central MP", party: "Labour (Co-op)" },
      },
    ]);
  });

  it("lists nothing when there's no one and nothing sent", async () => {
    expect(await constituencyCounts()).toEqual([]);
  });
});
