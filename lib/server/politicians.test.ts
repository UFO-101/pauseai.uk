import { describe, expect, it } from "vitest";
import { addTestMp, addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import {
  addPolitician,
  findSittingMp,
  findTestMp,
  getPolitician,
  isHouse,
  listPoliticians,
  setStatus,
  signatories,
  statusesOf,
  updatePolitician,
} from "./politicians";

const PM = "regulate-pm-letter";
const BILL = "support-sobel-bill";
const PEER = { house: "lords" as const, name: "Lord Example", salutation: "Lord Example", constituency: null, party: "Crossbench", email: null };

describe("isHouse", () => {
  it("knows the houses", () => {
    expect(isHouse("senedd")).toBe(true);
    expect(isHouse("hogwarts")).toBe(false);
  });
});

describeWithDatabase("politicians", () => {
  useTestDatabase();

  it("finds the sitting MP for a constituency, never one who has left or the test MP", async () => {
    const id = await addTestPolitician();
    await addTestPolitician({ parliamentId: 1, name: "Old MP", constituency: "Ipswich", sitting: false });
    await addTestMp();
    expect(await findSittingMp("Cities of London and Westminster")).toEqual({
      id,
      name: "Rachel Blake",
      salutation: "Ms Blake",
      constituency: "Cities of London and Westminster",
      email: "rachel.blake.mp@parliament.uk",
      isTest: false,
    });
    expect(await findSittingMp("Ipswich")).toBeUndefined();
    expect(await findSittingMp("Testshire")).toBeUndefined();
  });

  it("finds a test MP by their postcode", async () => {
    expect(await findTestMp("ZZ99ZZ")).toBeUndefined();
    const id = await addTestMp();
    expect(await findTestMp("ZZ99ZZ")).toMatchObject({ id, name: "Testy McTestface MP", email: "test-mp@example.org" });
    expect(await findTestMp("ZZ99ZS")).toBeUndefined();
  });

  it("sets, changes and clears statuses, logging each change", async () => {
    const id = await addTestPolitician();
    await setStatus(id, PM, { status: "signed", date: "2026-10-01", note: "By email" }, "jo@pauseai.uk");
    await setStatus(id, BILL, { status: "supports", date: null, note: "" }, "jo@pauseai.uk");
    expect(await statusesOf(id)).toEqual({ [PM]: "signed", [BILL]: "supports" });

    await setStatus(id, BILL, { status: null, date: null, note: "" }, "sam@pauseai.uk");
    expect(await statusesOf(id)).toEqual({ [PM]: "signed" });

    const politician = await getPolitician(id);
    expect(politician!.statuses[PM]).toMatchObject({ status: "signed", date: "2026-10-01", note: "By email", updatedBy: "jo@pauseai.uk" });
    const log = await query<{ actor: string; action: string }>("SELECT actor, action FROM audit_log ORDER BY id");
    expect(log).toEqual([
      { actor: "jo@pauseai.uk", action: "set status" },
      { actor: "jo@pauseai.uk", action: "set status" },
      { actor: "sam@pauseai.uk", action: "set status" },
    ]);
  });

  it("lists politicians, the test MP first, filtered by search, house and campaign", async () => {
    const mp = await addTestPolitician();
    const peer = await addPolitician(PEER, "jo@pauseai.uk");
    await addTestMp();
    await setStatus(peer, PM, { status: "signed", date: null, note: "" }, "jo@pauseai.uk");

    expect((await listPoliticians()).map((p) => p.name)).toEqual(["Testy McTestface MP", "Lord Example", "Rachel Blake"]);
    expect((await listPoliticians({ search: "westminster" })).map((p) => p.id)).toEqual([mp]);
    expect((await listPoliticians({ search: "CROSSBENCH" })).map((p) => p.id)).toEqual([peer]);
    expect((await listPoliticians({ house: "lords" })).map((p) => p.id)).toEqual([peer]);
    expect((await listPoliticians({ campaign: PM })).map((p) => p.id)).toEqual([peer]);
    expect(await listPoliticians({}, 1)).toHaveLength(1);
    expect((await listPoliticians({ search: "Rachel" }))[0]).toEqual({
      id: mp,
      parliamentId: 5257,
      house: "commons",
      name: "Rachel Blake",
      salutation: "Ms Blake",
      constituency: "Cities of London and Westminster",
      party: "Labour (Co-op)",
      email: "rachel.blake.mp@parliament.uk",
      isTest: false,
      sitting: true,
      statuses: {},
    });
  });

  it("adds and edits signers by hand, but not MPs from Parliament or the test MP", async () => {
    const peer = await addPolitician(PEER, "jo@pauseai.uk");
    expect(await updatePolitician(peer, { ...PEER, party: "Labour" }, "sam@pauseai.uk")).toBe(true);
    expect((await getPolitician(peer))!.party).toBe("Labour");

    const mp = await addTestPolitician();
    const test = await addTestMp();
    expect(await updatePolitician(mp, PEER, "sam@pauseai.uk")).toBe(false);
    expect(await updatePolitician(test, PEER, "sam@pauseai.uk")).toBe(false);
    expect((await getPolitician(mp))!.name).toBe("Rachel Blake");
    expect(await getPolitician(999)).toBeUndefined();

    const actions = await query<{ action: string }>("SELECT action FROM audit_log ORDER BY id");
    expect(actions.map((a) => a.action)).toEqual(["add politician", "edit politician"]);
  });

  it("lists who signed, by name, never the test MP or those who only support", async () => {
    const mp = await addTestPolitician();
    const peer = await addPolitician(PEER, "jo@pauseai.uk");
    const test = await addTestMp();
    const supporter = await addTestPolitician({ parliamentId: 2, name: "Sam Supporter", constituency: "Ipswich" });
    for (const id of [mp, peer, test]) await setStatus(id, PM, { status: "signed", date: null, note: "" }, "jo@pauseai.uk");
    await setStatus(supporter, PM, { status: "supports", date: null, note: "" }, "jo@pauseai.uk");

    expect(await signatories(PM)).toEqual([
      { name: "Lord Example", party: "Crossbench", constituency: "", house: "lords" },
      { name: "Rachel Blake", party: "Labour (Co-op)", constituency: "Cities of London and Westminster", house: "commons" },
    ]);
    expect(await signatories(BILL)).toEqual([]);
  });
});
