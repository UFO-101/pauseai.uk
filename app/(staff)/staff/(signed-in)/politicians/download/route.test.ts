import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { requestCookies } from "@/tests/next-headers";
import { downloadAs } from "@/tests/staff-download";
import { addTestPolitician } from "@/tests/database";
import { GET } from "./route";

vi.mock("next/headers", () => import("@/tests/next-headers"));

describeWithDatabase("GET /staff/politicians/download", () => {
  useTestDatabase();
  beforeEach(() => {
    requestCookies.clear();
    vi.stubEnv("SITE_ORIGIN", "https://pauseai.uk");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("gives every politician the filters find, named for the house and filters, and as cards", async () => {
    await addTestPolitician();
    await addTestPolitician({ name: "Lord Example", house: "lords", constituency: null, airtableId: "recLord" });
    const csv = await downloadAs(
      GET,
      "https://pauseai.uk/staff/politicians/download?format=csv&house=lords&party=Labour+(Co-op)",
    );
    expect(csv.headers.get("Content-Disposition")).toMatch(
      /filename="politicians_house_of_lords_party_labour_co_op_\d/,
    );
    expect(await csv.text()).toContain("Lord Example");
    const cards = await (await downloadAs(GET, "https://pauseai.uk/staff/politicians/download?format=vcf")).text();
    expect(cards).toMatch(/^FN:PauseAI \w{4} - Polly Placeholder$/m);
    expect(cards).toContain("ORG:House of Commons");
  });
});
