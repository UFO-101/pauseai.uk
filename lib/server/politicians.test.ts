import { describe, expect, it } from "vitest";
import { addTestLetter, addTestMp, addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query, transaction } from "./db";
import {
  addPolitician,
  canDeletePolitician,
  closestPoliticians,
  countPoliticians,
  deletePolitician,
  findMpInOffice,
  findTestMp,
  getPolitician,
  isHouse,
  isPersonStatus,
  listParties,
  listPoliticians,
  politicianHistory,
  politiciansPage,
  politiciansSearch,
  setStatus,
  signatories,
  statusesOf,
} from "./politicians";
import { POLITICIAN_SORTS } from "@/lib/politician-sort";
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
  it("keeps what was typed, and filters by it, a repeated filter by any of its values", () => {
    const typed = {
      q: "Jo",
      house: "lords",
      status: "retired",
      party: ["Crossbench", "Labour"],
      flag: ["important", "removed"],
      country: ["wales"],
      email: ["none", "blocked"],
      ask: BILL,
      answer: "signed",
      sort: "party",
      dir: "desc",
      page: "3",
    };
    expect(politiciansSearch(typed)).toEqual({
      ...typed,
      filter: {
        search: "Jo",
        house: "lords",
        status: "retired",
        party: ["Crossbench", "Labour"],
        flags: ["important", "removed"],
        country: ["wales"],
        email: ["none", "blocked"],
        ask: BILL,
        answer: "signed",
        sort: { key: "party", dir: "desc" },
        page: 3,
      },
    });
    // One of a filter that repeats, as the URL gives it, is a list of one; one that doesn't, given twice, its first.
    const once = politiciansSearch({ party: "Green", q: ["a", "b"] });
    expect(once.party).toEqual(["Green"]);
    expect(once.filter).toMatchObject({ party: ["Green"], search: "a" });
  });

  it("filters by nothing that's blank, missing or unknown", () => {
    const none = {
      search: undefined,
      house: undefined,
      status: "in_office",
      party: undefined,
      flags: undefined,
      country: undefined,
      email: undefined,
      ask: undefined,
      answer: undefined,
      sort: { key: "name", dir: "asc" },
      page: 1,
    };
    const blank = {
      q: "",
      house: "",
      status: "",
      party: [],
      flag: [],
      country: [],
      email: [],
      ask: "",
      answer: "",
      sort: "",
      dir: "",
      page: "",
    };
    expect(politiciansSearch({})).toEqual({ ...blank, filter: none });
    const unknown = {
      house: "hogwarts",
      status: "sitting",
      flag: ["other"],
      country: ["atlantis"],
      email: ["maybe"],
      sort: "age",
    };
    expect(politiciansSearch(unknown)).toEqual({ ...blank, ...unknown, filter: none });
    expect(politiciansSearch({ q: "  " }).filter.search).toBeUndefined();
  });

  it("is everyone, in office or not, with any status", () => {
    expect(politiciansSearch({ status: "any" }).filter.status).toBeUndefined();
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

  it("deletes a politician gone from Airtable, with their answers, logging who they were; never one still there, a test MP or one written to", async () => {
    const gone = await addTestPolitician({ airtableId: "recGone" });
    const there = await addTestPolitician({ name: "Still There", airtableId: "recThere" });
    const written = await addTestPolitician({ name: "Written To", airtableId: "recWritten" });
    const testMp = await addTestMp();
    await addTestLetter({ politicianId: written });
    await query("UPDATE notable_people SET airtable_removed_at = now() WHERE id IN ($1, $2)", [gone, written]);
    await setStatus(gone, PM, { status: "signed", date: null, note: "" }, "jo@pauseai.uk");

    for (const id of [there, written, testMp]) {
      expect(await canDeletePolitician(id)).toBe(false);
      expect(await deletePolitician(id, "jo@pauseai.uk")).toBe(false);
    }
    expect(await canDeletePolitician(gone)).toBe(true);
    expect(await deletePolitician(gone, "jo@pauseai.uk")).toBe(true);
    expect(await getPolitician(gone)).toBeUndefined();
    expect(await query("SELECT count(*)::int AS n FROM ask_statuses")).toEqual([{ n: 0 }]);
    expect(await query("SELECT actor, details FROM audit_log WHERE action = 'delete politician'")).toEqual([
      { actor: "jo@pauseai.uk", details: { id: gone, name: "Polly Placeholder", airtableId: "recGone" } },
    ]);
  });

  it("gives the politicians page: the list, its count and pages, and for a search, the others it finds", async () => {
    await addTestPolitician({ name: "Polly Placeholder" });
    await addTestPolitician({ name: "Peter Placeholder", status: "retired", airtableId: "recPeter" });
    await addTestPolitician({ ...PEER, name: "Lord Placeholder", airtableId: "recLord" });
    const page = (filter: Parameters<typeof politiciansPage>[0]) => politiciansPage(filter);

    expect(await page({ status: "in_office" })).toMatchObject({ total: 2, page: 1, pages: 1, closest: [] });
    // A search of those in office: how many are out of it.
    expect(await page({ search: "placeholder", status: "in_office" })).toMatchObject({ total: 2, outOfOffice: 1 });
    // A search of one house that finds no one there: how many in others, and the nearest names.
    const lords = await page({ search: "Polly", house: "lords", status: "in_office" });
    expect(lords).toMatchObject({ total: 0, otherHouses: 1, outOfOffice: 0 });
    const typo = await page({ search: "Plaseholder", house: "lords" });
    expect(typo.closest.map((p) => p.name)).toEqual(["Lord Placeholder"]);
    expect(await page({ search: "zzz", status: "in_office" })).toMatchObject({ otherHouses: 0, closest: [] });
    expect(await page({ page: 2 })).toMatchObject({ page: 2, politicians: [] });
  });

  it("finds those in office, or out of it, and counts them", async () => {
    const mp = await addTestPolitician();
    const retired = await addTestPolitician({ name: "Old Placeholder", status: "retired", airtableId: "recOld" });
    expect((await listPoliticians({ status: "in_office" })).map((p) => p.id)).toEqual([mp]);
    expect((await listPoliticians({ status: "out" })).map((p) => p.id)).toEqual([retired]);
    expect(await countPoliticians({ search: "placeholder", status: "out" })).toBe(1);
    expect(await countPoliticians({})).toBe(2);
  });

  it("offers those whose name or constituency is nearest a search that finds no one, nearest first", async () => {
    const mp = await addTestPolitician({ name: "Tristan Osborne", constituency: "Chatham and Aylesford" });
    const other = await addTestPolitician({ name: "Tristram Hunt", constituency: "Stoke", airtableId: "recHunt" });
    await addPeer();
    expect((await closestPoliticians({ search: "Tristian Osbourne" })).map((p) => p.id)).toEqual([mp]);
    expect((await closestPoliticians({ search: "Tristan" })).map((p) => p.id)).toEqual([mp, other]);
    expect((await closestPoliticians({ search: "Aylesfrod" })).map((p) => p.id)).toEqual([mp]);
    // Within the other filters.
    expect(await closestPoliticians({ search: "Tristian Osbourne", house: "lords" })).toEqual([]);
    expect(await closestPoliticians({ search: "Tristan", status: "in_office" }, 1)).toHaveLength(1);
    expect(await closestPoliticians({ search: "zzzz" })).toEqual([]);
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
    expect((await listPoliticians({ party: [(await getPolitician(peer))!.party] })).map((p) => p.id)).toEqual([peer]);
    expect(await listPoliticians({}, 1)).toHaveLength(1);
    // A page further on.
    expect((await listPoliticians({ page: 2 }, 1)).map((p) => p.name)).toEqual(["Lord Example"]);
    // Each word anywhere, ignoring case and accents; a % or _ is only itself.
    expect((await listPoliticians({ search: "poll westminster" })).map((p) => p.id)).toEqual([mp]);
    expect((await listPoliticians({ search: "Pólly lords" })).map((p) => p.id)).toEqual([]);
    expect((await listPoliticians({ search: "Lord Exámple" })).map((p) => p.id)).toEqual([peer]);
    expect((await listPoliticians({ search: "%" })).map((p) => p.id)).toEqual([]);
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
      email: "polly.placeholder.mp@parliament.uk",
      status: "in_office",
      notes: "",
      importantTarget: false,
      personalConnection: false,
      isTest: false,
      emailBlocked: false,
      letters: 0,
      replies: 0,
      firstActivityAt: null,
      lastActivityAt: null,
      statuses: {},
    });
    // The Asks column sorts by when their newest answer was recorded, newest first, those without last.
    await setStatus(mp, PM, { status: "signed", date: null, note: "" }, "jo@pauseai.uk");
    const byAsks = await listPoliticians({ sort: { key: "asks", dir: "desc" } });
    expect(byAsks.filter((p) => !p.isTest).map((p) => p.id)).toEqual([mp, peer]);
    // An answer is activity: first and last activity sort by it, those with none last.
    const polly = (await listPoliticians({ search: "Polly" }))[0];
    expect(polly.firstActivityAt).toEqual(polly.lastActivityAt);
    expect(polly.lastActivityAt).not.toBeNull();
    for (const [key, field] of [
      ["first", "firstActivityAt"],
      ["active", "lastActivityAt"],
    ] as const) {
      const dir = POLITICIAN_SORTS[key];
      const times = (await listPoliticians({ sort: { key, dir } }))
        .filter((p) => !p.isTest)
        .map((p) => (p[field] ? new Date(p[field]!).getTime() : null));
      const known = times.filter((t): t is number => t !== null);
      expect(times).toEqual([
        ...known.toSorted((a, b) => (dir === "asc" ? a - b : b - a)),
        ...times.filter((t) => t === null),
      ]);
    }
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
    expect(await ids({ party: ["Crossbench"] })).toEqual([peer]);
    expect(await ids({ party: ["Crossbench", "Labour (Co-op)"] })).toEqual([mp, peer].sort());
    expect(await ids({ flags: ["important"] })).toEqual([mp]);
    expect(await ids({ flags: ["connection"] })).toEqual([peer]);
    expect(await ids({ flags: ["removed"] })).toEqual([retired]);
    expect(await ids({ flags: ["important", "removed"] })).toEqual([mp, retired].sort());
    // By nation; and by whether we can write to them: an address, none, or a blocked one.
    await query("UPDATE politicians SET country = 'wales' WHERE id = $1", [peer]);
    expect(await ids({ country: ["wales"] })).toEqual([peer]);
    expect(await ids({ country: ["wales", "scotland"], status: undefined })).toEqual([peer]);
    await query("UPDATE notable_people SET email = NULL WHERE id = $1", [retired]);
    await query("UPDATE notable_people SET email = 'Peer@Example.org' WHERE id = $1", [peer]);
    await query("UPDATE notable_people SET email = 'mp@example.org' WHERE id = $1", [mp]);
    await recordProblem({ address: "peer@example.org", messageId: null, kind: "hard", reason: "gone", canReset: true });
    expect(await ids({ email: ["none"] })).toEqual([retired]);
    expect(await ids({ email: ["blocked"] })).toEqual([peer]);
    expect(await ids({ email: ["yes"] })).toEqual([mp]);
    expect(await ids({ email: ["yes", "none"] })).toEqual([mp, retired].sort());
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
