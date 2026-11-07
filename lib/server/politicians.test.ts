import { describe, expect, it, vi } from "vitest";
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
  emailsIn,
  findPasted,
  findPastedLines,
  looksLikeName,
  pastedName,
  politicianNames,
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
  it("keeps what was typed, and filters by it, a repeated filter by any of its values and none of those marked !", () => {
    const typed = {
      q: "Jo",
      house: "lords",
      status: "retired",
      party: ["Crossbench", "Labour", "!Reform UK"],
      flag: ["important", "removed", "!connection"],
      nation: ["wales", "!scotland"],
      email: ["none", "blocked", "!yes"],
      ask: BILL,
      answer: "signed",
      mailed: ["deepmind-letter", "!frontier-ai-letter"],
      sort: "party",
      dir: "desc",
      page: "3",
      mailing: "12",
    };
    expect(politiciansSearch(typed)).toEqual({
      ...typed,
      tab: "",
      signed: "",
      pasted: [],
      saved: "",
      filter: {
        search: "Jo",
        house: "lords",
        status: "retired",
        party: ["Crossbench", "Labour"],
        flags: ["important", "removed"],
        country: ["wales"],
        email: ["none", "blocked"],
        mailed: ["deepmind-letter"],
        ask: BILL,
        answer: "signed",
        not: {
          party: ["Reform UK"],
          flags: ["connection", "test"],
          country: ["scotland"],
          email: ["yes"],
          mailed: ["frontier-ai-letter"],
        },
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
      mailed: undefined,
      ask: undefined,
      answer: undefined,
      not: { flags: ["test"] },
      sort: { key: "name", dir: "asc" },
      page: 1,
    };
    const blank = {
      q: "",
      house: "",
      status: "",
      party: [],
      flag: [],
      nation: [],
      email: [],
      ask: "",
      answer: "",
      mailed: [],
      signed: "",
      sort: "",
      dir: "",
      page: "",
      mailing: "",
      tab: "",
      pasted: [],
      saved: "",
    };
    expect(politiciansSearch({})).toEqual({ ...blank, filter: none });
    // A draft's ID is a number; the ticked tab is "1"; the lines pasted are a list.
    expect(politiciansSearch({ mailing: "12x", tab: "yes" })).toMatchObject({ mailing: "", tab: "" });
    expect(politiciansSearch({ mailing: "12", tab: "ticked", pasted: ["Jo", "Al"] })).toMatchObject({
      mailing: "12",
      tab: "ticked",
      pasted: ["Jo", "Al"],
    });
    const unknown = {
      house: "hogwarts",
      status: "sitting",
      party: ["!"],
      flag: ["other", "!other"],
      nation: ["atlantis"],
      email: ["maybe"],
      sort: "age",
    };
    expect(politiciansSearch(unknown)).toEqual({ ...blank, ...unknown, filter: none });
    expect(politiciansSearch({ q: "  " }).filter.search).toBeUndefined();
  });

  it("leaves out the test politicians, unless the Marked filter finds them", () => {
    expect(politiciansSearch({ flag: "test" }).filter).toMatchObject({ flags: ["test"], not: undefined });
    expect(politiciansSearch({ flag: ["important", "test"] }).filter.not).toBeUndefined();
    expect(politiciansSearch({ flag: "!test" }).filter).toMatchObject({ flags: undefined, not: { flags: ["test"] } });
  });

  it("is everyone, in office or not, with any status", () => {
    expect(politiciansSearch({ status: "any" }).filter.status).toBeUndefined();
  });
});

describe("looksLikeName", () => {
  it("is two to four capitalised words with no digits", () => {
    expect(looksLikeName("Jane Smith")).toBe(true);
    expect(looksLikeName("Ána de la Cruz")).toBe(false);
    expect(looksLikeName("Labour")).toBe(false);
    expect(looksLikeName("One Two Three Four Five")).toBe(false);
    expect(looksLikeName("Jane Smith 2")).toBe(false);
    expect(looksLikeName("Area 51")).toBe(false);
  });
});

describe("emailsIn", () => {
  it("finds every email address in some text, lowercase", () => {
    expect(emailsIn("Email: Treascom@Parliament.UK, or <jo@example.org>.")).toEqual([
      "treascom@parliament.uk",
      "jo@example.org",
    ]);
    expect(emailsIn("no address here")).toEqual([]);
  });
});

describe("pastedName", () => {
  it("takes the bullet, the brackets, the titles and the letters after a name off a line pasted", () => {
    expect(pastedName("1. The Rt Hon Jane Smith MP (Labour),")).toBe("Jane Smith");
    expect(pastedName("• Dr. Morag Example MSP")).toBe("Morag Example");
    expect(pastedName("- Exampleton West;")).toBe("Exampleton West");
    expect(pastedName("  Jane.Smith.MP@Parliament.uk ")).toBe("Jane.Smith.MP@Parliament.uk");
    expect(pastedName(" MP ")).toBe("");
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
    expect(await findTestMp("ZZ99ZZ")).toMatchObject({
      id,
      name: "Testy McTestface MP",
      email: "test-mp@parliament.example",
    });
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

    await setStatus(id, BILL, { status: null, date: null, note: "" }, "samuel.whitlock@pauseai.uk");
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
      { actor: "samuel.whitlock@pauseai.uk", action: "set status" },
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
    // A search that finds no one, as test politicians are left out: how many it finds among them, whatever
    // else of Marked is left out; and none when it finds someone, or they aren't left out.
    await addTestMp();
    const hidden = {
      search: "McTestface",
      status: "in_office" as const,
      not: { flags: ["removed" as const, "test" as const] },
    };
    expect(await page(hidden)).toMatchObject({ total: 0, tests: 1 });
    expect(await page({ ...hidden, search: "placeholder" })).toMatchObject({ tests: 0 });
    expect(await page({ ...hidden, not: undefined })).toMatchObject({ total: 1, tests: 0 });
    expect(await page({ ...hidden, not: { flags: ["removed"] } })).toMatchObject({ total: 1, tests: 0 });
    expect(await page({ page: 2 })).toMatchObject({ page: 2, politicians: [] });
  });

  it("finds those who signed in the last so many days, once each, not by Airtable's record", async () => {
    vi.stubEnv("FIXTURE_NOW", "2026-10-21T12:00:00.000Z");
    const signer = await addTestPolitician();
    const before = await addTestPolitician({ name: "Old Placeholder", airtableId: "recOld" });
    const byAirtable = await addTestPolitician({ name: "Air Placeholder", airtableId: "recAir" });
    await query(
      `INSERT INTO ask_statuses (notable_person_id, ask, ask_kind, status, updated_by, updated_at) VALUES
         ($1, 'frontier-ai-letter', 'letter', 'signed', 'x', '2026-10-20T00:00:00Z'),
         ($1, 'deepmind-letter', 'letter', 'signed', 'x', '2026-10-19T00:00:00Z'),
         ($2, 'deepmind-letter', 'letter', 'signed', 'x', '2026-09-30T00:00:00Z'),
         ($3, 'deepmind-letter', 'letter', 'signed', 'airtable', '2026-10-20T00:00:00Z')`,
      [signer, before, byAirtable],
    );
    expect((await listPoliticians({ signedDays: 7 })).map((p) => p.id)).toEqual([signer]);
    expect((await listPoliticians({ signedDays: 30 })).map((p) => p.id).sort()).toEqual([signer, before].sort());
    vi.unstubAllEnvs();
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

  it("finds who a line pasted names, by name, constituency or email, or those it might be", async () => {
    const jane = await addTestPolitician({
      name: "Jane Smith",
      constituency: "Exampleton West",
      email: "jane@example.org",
    });
    const david = await addTestPolitician({ name: "David Smith", constituency: "Sampleford", airtableId: "rec2" });
    const lord = await addTestPolitician({
      name: "David Smith",
      house: "lords",
      constituency: null,
      airtableId: "rec3",
    });
    const ben = await addTestPolitician({ name: "Ben Owen", constituency: "Bath", airtableId: "rec4" });
    const nina = await addTestPolitician({ name: "Nina Noemail", email: null, airtableId: "rec5" });
    await addTestPolitician({ name: "Ann Gone", status: "retired", airtableId: "rec6" });
    const found = async (line: string) => {
      const { matches, by, choices, near } = await findPasted(line);
      return { matches: matches.map((one) => one.id), by, choices: choices.map((one) => one.id), near };
    };
    expect(await found("Jane Smith MP")).toEqual({
      matches: [jane],
      by: { [jane]: "name" },
      choices: [],
      near: undefined,
    });
    expect(await found("Nina Noemail")).toMatchObject({ matches: [nina], by: { [nina]: "name" } });
    // Everyone a line names, however much else is there: a row copied from the table, a list, a page.
    expect(await found("Jane Smith\tHouse of Commons\tExampleton West\tLabour\tNone\t0\t0")).toMatchObject({
      matches: [jane],
    });
    expect(await found("Dear Ann Gone, Jane Smith and David Smith,")).toEqual({
      matches: [jane],
      by: { [jane]: "name" },
      choices: [david, lord],
      near: undefined,
    });
    // A constituency as it's written, capitals and all, anywhere in a line; an email anywhere, in any case.
    expect(await found("The MPs for Exampleton West and Bath")).toEqual({
      matches: [ben, jane],
      by: { [ben]: "constituency", [jane]: "constituency" },
      choices: [],
      near: undefined,
    });
    expect(await found("Run a bath")).toEqual({ matches: [], by: {}, choices: [] });
    expect(await found("Write to JANE@example.org, please")).toMatchObject({
      matches: [jane],
      by: { [jane]: "email" },
    });
    // A line that looks like a name: every word in a name or constituency, one found, more to choose from.
    expect(await found("David Samplef")).toMatchObject({ matches: [david], by: { [david]: "words" } });
    expect(await found("David Smit")).toMatchObject({ matches: [], by: {}, choices: [david, lord] });
    // Then the nearest names, by name alone, only those in office, and only those near.
    const nearest = await found("Jane Smoth");
    expect([nearest.matches, nearest.choices[0], nearest.near]).toEqual([[], jane, true]);
    expect(await found("Ann Gone")).toEqual({ matches: [], by: {}, choices: [], near: true });
    expect(await found("West Bathwick")).toEqual({ matches: [], by: {}, choices: [], near: true });
    // Not a name: a party, a heading, one word.
    expect(await found("Labour")).toEqual({ matches: [], by: {}, choices: [] });
    expect(await found("Skip to main content")).toEqual({ matches: [], by: {}, choices: [] });
    expect(await found("(nobody)")).toEqual({ matches: [], by: {}, choices: [] });
  });

  it("keeps of the lines pasted those that found someone not found before, and counts those that found no one", async () => {
    const jane = await addTestPolitician({ name: "Jane Smith", constituency: "Exampleton West" });
    const { lines, skipped } = await findPastedLines(["Jane Smith MP", "Exampleton West", "Labour", "Chair"]);
    expect(lines.map((line) => [line.line, line.matches.map((one) => one.id)])).toEqual([["Jane Smith MP", [jane]]]);
    expect(skipped).toBe(2);
  });

  it("names politicians by their IDs, and finds only those IDs", async () => {
    const jane = await addTestPolitician({ name: "Jane Smith" });
    const david = await addTestPolitician({ name: "David Smith", airtableId: "rec2" });
    expect(await politicianNames([jane, david, 999999])).toEqual({ [jane]: "Jane Smith", [david]: "David Smith" });
    expect((await listPoliticians({ ids: [david] })).map((p) => p.id)).toEqual([david]);
    expect(await listPoliticians({ ids: [] })).toEqual([]);
  });

  it("lists politicians by name, filtered by search, house and ask", async () => {
    const mp = await addTestPolitician();
    const peer = await addPeer();
    await addTestMp();
    await setStatus(peer, PM, { status: "signed", date: null, note: "" }, "jo@pauseai.uk");

    expect((await listPoliticians()).map((p) => p.name)).toEqual([
      "Lord Example",
      "Polly Placeholder",
      "Testy McTestface MP",
    ]);
    expect((await listPoliticians({ search: "westminster" })).map((p) => p.id)).toEqual([mp]);
    expect((await listPoliticians({ search: "CROSSBENCH" })).map((p) => p.id)).toEqual([peer]);
    expect((await listPoliticians({ house: "lords" })).map((p) => p.id)).toEqual([peer]);
    // Sorted by a column, either way.
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
    expect((await listPoliticians({ page: 2 }, 1)).map((p) => p.name)).toEqual(["Polly Placeholder"]);
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
    const test = await addTestMp();
    expect(await ids({ flags: ["test"], status: undefined })).toEqual([test]);
    expect(await ids({ not: { flags: ["test"] }, status: undefined })).toEqual([mp, peer, retired].sort());
    await query("DELETE FROM notable_people WHERE id = $1", [test]);
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
    // Leaving out: those with none of a filter's values; no nation at all is none of them.
    expect(await ids({ not: { party: ["Crossbench"] } })).toEqual([mp, retired].sort());
    expect(await ids({ party: ["Crossbench", "Labour (Co-op)"], not: { party: ["Crossbench"] } })).toEqual([mp]);
    expect(await ids({ party: ["Crossbench"], not: { party: ["Crossbench"] } })).toEqual([]);
    expect(await ids({ not: { flags: ["important", "removed"] } })).toEqual([peer]);
    expect(await ids({ not: { country: ["wales"] } })).toEqual([mp, retired].sort());
    expect(await ids({ not: { email: ["blocked"] } })).toEqual([mp, retired].sort());
    expect(await ids({ ask: EDINBURGH })).toEqual([mp, peer].sort());
    expect(await ids({ ask: EDINBURGH, answer: "going" })).toEqual([peer]);
    expect(await ids({ ask: EDINBURGH, answer: "none" })).toEqual([retired]);
    // An answer to any ask, or none to any.
    expect(await ids({ answer: "going" })).toEqual([peer]);
    expect(await ids({ answer: "none" })).toEqual([retired]);
    // Mailed about an ask: a mailing about it went or is going to them, not one stopped or skipped.
    const [{ id: mailing }] = await query<{ id: number }>(
      `INSERT INTO mailings (title, ask, audience, channel, state, airtable_sent_between)
       VALUES ('Edinburgh', $1, 'politicians', 'email', 'sent', '[2026-01-01,2026-01-02)') RETURNING id::int AS id`,
      [EDINBURGH],
    );
    for (const [who, status] of [
      [mp, "sent"],
      [peer, "skipped"],
    ] as const) {
      const [{ id }] = await query<{ id: number }>(
        "INSERT INTO letters (kind, notable_person_id, status) VALUES ('pauseai', $1, $2) RETURNING id::int AS id",
        [who, status],
      );
      await query("INSERT INTO letters_from_pauseai (id, mailing_id) VALUES ($1, $2)", [id, mailing]);
    }
    expect(await ids({ mailed: [EDINBURGH] })).toEqual([mp]);
    expect(await ids({ not: { mailed: [EDINBURGH] } })).toEqual([peer, retired].sort());
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
    await logChange("samuel.whitlock@pauseai.uk", "edit politician", { id: peer, name: "Lord Example" });
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
      ["edit politician", "samuel.whitlock@pauseai.uk"],
    ]);
    const history = await politicianHistory(mp, "Polly.Placeholder.MP@parliament.uk");
    expect(history.map((c) => c.action)).toEqual(["unblock address", "block address", "set status"]);
    expect(history[0].details).toEqual({ address: "polly.placeholder.mp@parliament.uk", note: "Back" });
    expect(await politicianHistory(mp, null)).toHaveLength(1);
  });

  it("lists who signed, by name, never the test MP, those without a status or those who declined", async () => {
    const mp = await addTestPolitician();
    const peer = await addPeer();
    const test = await addTestMp();
    await addTestPolitician({ airtableId: "rec2", name: "Sam Unsigned", constituency: "Ipswich" });
    const decliner = await addTestPolitician({ airtableId: "rec3", name: "Dee Declined", constituency: "Bath" });
    await setStatus(decliner, PM, { status: "declined", date: null, note: "" }, "jo@pauseai.uk");
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
