import { describe, expect, it } from "vitest";
import { addTestLetter, addTestMp, addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query, transaction } from "./db";
import {
  addPolitician,
  findMpInOffice,
  findTestMp,
  getPolitician,
  isHouse,
  isPersonStatus,
  listParties,
  listPoliticians,
  politicianHistory,
  politiciansSearch,
  setStatus,
  signatories,
  statusesOf,
} from "./politicians";
import { recordProblem } from "./email";
import { logChange } from "./audit";

const PM = "frontier-ai-letter";
const BILL = "controlai-letter";
const EDINBURGH = "edinburgh-conference-2026";
const PEER = {
  house: "lords" as const,
  name: "Lord Example",
  salutation: "Lord Example",
  constituency: null,
  party: "Crossbench",
  email: null,
};
/** A peer, as the signatory import adds them. */
const addPeer = () => addTestPolitician({ ...PEER, airtableId: null });

describe("isHouse", () => {
  it("knows the houses", () => {
    expect(isHouse("senedd")).toBe(true);
    expect(isHouse("hogwarts")).toBe(false);
  });
});

describe("isPersonStatus", () => {
  it("knows whether someone is in office", () => {
    expect(isPersonStatus("retired")).toBe(true);
    expect(isPersonStatus("sitting")).toBe(false);
  });
});

describe("politiciansSearch", () => {
  it("keeps what was typed, and filters by it", () => {
    const typed = {
      q: "Jo",
      house: "lords",
      status: "retired",
      party: "Crossbench",
      flag: "important",
      ask: BILL,
      answer: "signed",
      sort: "party",
      dir: "desc",
    };
    expect(politiciansSearch(typed)).toEqual({
      ...typed,
      filter: {
        search: "Jo",
        house: "lords",
        status: "retired",
        party: "Crossbench",
        importantTarget: true,
        personalConnection: undefined,
        airtableRemoved: undefined,
        ask: BILL,
        answer: "signed",
        sort: { key: "party", dir: "desc" },
      },
    });
    expect(politiciansSearch({ flag: "connection" }).filter).toMatchObject({ personalConnection: true });
    expect(politiciansSearch({ flag: "removed" }).filter).toMatchObject({ airtableRemoved: true });
  });

  it("filters by nothing that's blank, missing or unknown", () => {
    const none = {
      search: undefined,
      house: undefined,
      status: undefined,
      party: undefined,
      importantTarget: undefined,
      personalConnection: undefined,
      airtableRemoved: undefined,
      ask: undefined,
      answer: undefined,
      sort: { key: "name", dir: "asc" },
    };
    const blank = {
      q: "",
      house: "",
      status: "",
      party: "",
      flag: "",
      ask: "",
      answer: "",
      sort: "",
      dir: "",
    };
    expect(politiciansSearch({})).toEqual({ ...blank, filter: none });
    const unknown = {
      house: "hogwarts",
      status: "sitting",
      flag: "other",
      sort: "age",
    };
    expect(politiciansSearch(unknown)).toEqual({ ...blank, ...unknown, filter: none });
  });
});

describeWithDatabase("politicians", () => {
  useTestDatabase();

  it("finds the MP in office for a constituency, never one who has left or the test MP", async () => {
    const id = await addTestPolitician();
    await addTestPolitician({ airtableId: "rec1", name: "Old MP", constituency: "Ipswich", status: "retired" });
    await addTestMp();
    expect(await findMpInOffice("Cities of London and Westminster")).toEqual({
      id,
      name: "Polly Placeholder",
      salutation: "Ms Placeholder",
      constituency: "Cities of London and Westminster",
      email: "polly.placeholder.mp@parliament.uk",
      isTest: false,
      unreachable: false,
    });
    expect(await findMpInOffice("Ipswich")).toBeUndefined();
    expect(await findMpInOffice("Testshire")).toBeUndefined();
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
    await setStatus(id, BILL, { status: "signed", date: null, note: "" }, "jo@pauseai.uk");
    // An event's answer isn't a letter's, so Email your MP isn't given it.
    await setStatus(id, EDINBURGH, { status: "declined", date: null, note: "" }, "jo@pauseai.uk");
    expect(await statusesOf(id)).toEqual({ [PM]: "signed", [BILL]: "signed" });
    expect((await getPolitician(id))!.statuses[EDINBURGH]).toMatchObject({ status: "declined" });
    await setStatus(id, EDINBURGH, { status: null, date: null, note: "" }, "jo@pauseai.uk");

    await setStatus(id, BILL, { status: null, date: null, note: "" }, "sam@pauseai.uk");
    expect(await statusesOf(id)).toEqual({ [PM]: "signed" });

    const politician = await getPolitician(id);
    expect(politician!.statuses[PM]).toMatchObject({
      status: "signed",
      date: "2026-10-01",
      note: "By email",
      updatedBy: "jo@pauseai.uk",
    });
    const log = await query<{ actor: string; action: string }>("SELECT actor, action FROM audit_log ORDER BY id");
    expect(log).toEqual([
      ...Array(4).fill({ actor: "jo@pauseai.uk", action: "set status" }),
      { actor: "sam@pauseai.uk", action: "set status" },
    ]);
  });

  it("refuses a status the ask's kind doesn't allow", async () => {
    const id = await addTestPolitician();
    await expect(setStatus(id, PM, { status: "going", date: null, note: "" }, "jo@pauseai.uk")).rejects.toThrow(
      /foreign key/,
    );
    expect(await statusesOf(id)).toEqual({});
  });

  it("lists politicians, the test MP first, filtered by search, house and ask", async () => {
    const mp = await addTestPolitician();
    const peer = await addPeer();
    await addTestMp();
    await setStatus(peer, PM, { status: "signed", date: null, note: "" }, "jo@pauseai.uk");

    expect((await listPoliticians()).map((p) => p.name)).toEqual([
      "Testy McTestface MP",
      "Lord Example",
      "Polly Placeholder",
    ]);
    expect((await listPoliticians({ search: "westminster" })).map((p) => p.id)).toEqual([mp]);
    expect((await listPoliticians({ search: "CROSSBENCH" })).map((p) => p.id)).toEqual([peer]);
    expect((await listPoliticians({ house: "lords" })).map((p) => p.id)).toEqual([peer]);
    // Sorted by a column, either way, the test MPs staying first.
    const byParty = (dir: "asc" | "desc") =>
      listPoliticians({ sort: { key: "party", dir } }).then((rows) =>
        rows.filter((p) => !p.isTest).map((p) => p.party),
      );
    expect(await byParty("asc")).toEqual([...(await byParty("asc"))].sort());
    expect(await byParty("desc")).toEqual([...(await byParty("asc"))].reverse());
    expect((await listPoliticians({ ask: PM })).map((p) => p.id)).toEqual([peer]);
    expect((await listPoliticians({ party: (await getPolitician(peer))!.party })).map((p) => p.id)).toEqual([peer]);
    expect(await listPoliticians({}, 1)).toHaveLength(1);
    expect((await listPoliticians({ search: "Polly" }))[0]).toEqual({
      id: mp,
      airtableId: "recPlaceholder",
      airtableRemovedAt: null,
      house: "commons",
      name: "Polly Placeholder",
      salutation: "Ms Placeholder",
      constituency: "Cities of London and Westminster",
      party: "Labour (Co-op)",
      country: null,
      city: null,
      email: "polly.placeholder.mp@parliament.uk",
      status: "in_office",
      notes: "",
      importantTarget: false,
      personalConnection: false,
      isTest: false,
      emailBlocked: false,
      letters: 0,
      replies: 0,
      statuses: {},
    });
    // The Asks column sorts by when their newest answer was recorded, newest first, those without last.
    await setStatus(mp, PM, { status: "signed", date: null, note: "" }, "jo@pauseai.uk");
    const byAsks = await listPoliticians({ sort: { key: "asks", dir: "desc" } });
    expect(byAsks.filter((p) => !p.isTest).map((p) => p.id)).toEqual([mp, peer]);
    // Everyone who signed anything, by their newest answer.
    await setStatus(peer, BILL, { status: "signed", date: null, note: "" }, "jo@pauseai.uk");
    const signed = await listPoliticians({ answer: "signed", sort: { key: "asks", dir: "desc" } });
    expect(signed.map((p) => p.id)).toEqual([peer, mp]);
  });

  it("counts the letters to each politician, leaving out those never sent, and how many were answered", async () => {
    const mp = await addTestPolitician();
    await addTestLetter({ politicianId: mp, repliedAt: new Date().toISOString() });
    await addTestLetter({ politicianId: mp, status: "bounced" });
    await addTestLetter({ politicianId: mp, status: "not_sent" });
    expect(await getPolitician(mp)).toMatchObject({ letters: 2, replies: 1 });
    expect((await listPoliticians({ sort: { key: "letters", dir: "desc" } }))[0].id).toBe(mp);
  });

  it("knows whose address is blocked, whatever its case, in the list too", async () => {
    const mp = await addTestPolitician();
    await addPeer();
    await recordProblem({
      address: "Polly.Placeholder.MP@parliament.uk",
      messageId: null,
      kind: "hard",
      reason: "",
      canReset: true,
    });
    expect(await findMpInOffice("Cities of London and Westminster")).toMatchObject({ unreachable: true });
    expect((await getPolitician(mp))!.emailBlocked).toBe(true);
    expect((await listPoliticians()).filter((p) => p.emailBlocked).map((p) => p.id)).toEqual([mp]);
  });

  it("filters by status, party, Airtable's markers, and an answer to an ask or none", async () => {
    const mp = await addTestPolitician();
    const peer = await addPeer();
    const retired = await addTestPolitician({ airtableId: "rec3", name: "Rita Retired", status: "retired", party: "" });
    await query("UPDATE notable_people SET important_target = true WHERE id = $1", [mp]);
    await query("UPDATE notable_people SET personal_connection = true WHERE id = $1", [peer]);
    await query("UPDATE notable_people SET airtable_removed_at = now() WHERE id = $1", [retired]);
    await setStatus(mp, EDINBURGH, { status: "declined", date: null, note: "" }, "airtable");
    await setStatus(peer, EDINBURGH, { status: "going", date: null, note: "" }, "airtable");
    const ids = async (filter: Parameters<typeof listPoliticians>[0]) =>
      (await listPoliticians(filter)).map((p) => p.id).sort();
    expect(await ids({ status: "retired" })).toEqual([retired]);
    expect(await ids({ status: "in_office" })).toEqual([mp, peer].sort());
    expect(await ids({ party: "Crossbench" })).toEqual([peer]);
    expect(await ids({ importantTarget: true })).toEqual([mp]);
    expect(await ids({ personalConnection: true })).toEqual([peer]);
    expect(await ids({ airtableRemoved: true })).toEqual([retired]);
    expect(await ids({ ask: EDINBURGH })).toEqual([mp, peer].sort());
    expect(await ids({ ask: EDINBURGH, answer: "going" })).toEqual([peer]);
    expect(await ids({ ask: EDINBURGH, answer: "none" })).toEqual([retired]);
    // An answer to any ask, or none to any.
    expect(await ids({ answer: "going" })).toEqual([peer]);
    expect(await ids({ answer: "none" })).toEqual([retired]);
    // The parties to choose from, without the blank one.
    expect(await listParties()).toEqual(["Crossbench", "Labour (Co-op)"]);
  });

  it("adds a politician, as their two rows, and a test MP by their postcode", async () => {
    const id = await transaction((db) => addPolitician({ house: "lords", name: "Lord Added", email: null }, db));
    expect(await getPolitician(id)).toMatchObject({ name: "Lord Added", salutation: "", party: "", isTest: false });
    const test = await transaction((db) =>
      addPolitician({ house: "commons", name: "Testy", email: null, constituency: "Testshire" }, db, "ZZ99ZZ"),
    );
    expect(await findTestMp("ZZ99ZZ")).toMatchObject({ id: test, isTest: true });
  });

  it("finds no politician by an unknown id", async () => {
    expect(await getPolitician(999)).toBeUndefined();
  });

  it("tells one politician's history from the audit log: edits, statuses, and their address blocked or unblocked, newest first", async () => {
    const peer = await addPeer();
    const mp = await addTestPolitician();
    // As the MP sync logs an edit.
    await logChange("sam@pauseai.uk", "edit politician", { id: peer, name: "Lord Example" });
    await setStatus(mp, PM, { status: "signed", date: null, note: "" }, "jo@pauseai.uk");
    await setStatus(peer, PM, { status: "signed", date: null, note: "" }, "jo@pauseai.uk");
    await recordProblem({
      address: "Polly.Placeholder.MP@parliament.uk",
      kind: "hard",
      reason: "Gone",
      messageId: "m",
      canReset: true,
    });
    // As unblock() logs it, without asking the provider.
    await logChange("jo@pauseai.uk", "unblock address", {
      address: "polly.placeholder.mp@parliament.uk",
      note: "Back",
    });
    // As the imports log them: added, and gone from Airtable.
    await logChange("jo@pauseai.uk", "add politician", { id: peer, name: "Lord Example" });
    await logChange("sync", "remove politician", { id: peer, name: "Lord Example" });
    // Not theirs: a held sync's run with the same id, and someone else's status.
    await logChange("jo@pauseai.uk", "apply held MP sync", { id: peer });
    expect((await politicianHistory(peer, null)).map((c) => [c.action, c.actor])).toEqual([
      ["remove politician", "sync"],
      ["add politician", "jo@pauseai.uk"],
      ["set status", "jo@pauseai.uk"],
      ["edit politician", "sam@pauseai.uk"],
    ]);
    const history = await politicianHistory(mp, "Polly.Placeholder.MP@parliament.uk");
    expect(history.map((c) => c.action)).toEqual(["unblock address", "block address", "set status"]);
    expect(history[0].details).toEqual({ address: "polly.placeholder.mp@parliament.uk", note: "Back" });
    expect(await politicianHistory(mp, null)).toHaveLength(1);
  });

  it("lists who signed, by name, never the test MP or those without a status", async () => {
    const mp = await addTestPolitician();
    const peer = await addPeer();
    const test = await addTestMp();
    await addTestPolitician({ airtableId: "rec2", name: "Sam Unsigned", constituency: "Ipswich" });
    for (const id of [mp, peer, test])
      await setStatus(id, PM, { status: "signed", date: null, note: "" }, "jo@pauseai.uk");

    expect(await signatories(PM)).toEqual([
      { name: "Lord Example", party: "Crossbench", constituency: "", house: "lords" },
      {
        name: "Polly Placeholder",
        party: "Labour (Co-op)",
        constituency: "Cities of London and Westminster",
        house: "commons",
      },
    ]);
    expect(await signatories(BILL)).toEqual([]);
  });
});
