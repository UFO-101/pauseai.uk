import { describe, expect, it } from "vitest";
import { addTestMp, addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import {
  findSittingMp,
  findTestMp,
  getPolitician,
  isHouse,
  listPoliticians,
  politicianHistory,
  politiciansSearch,
  setStatus,
  signatories,
  statusesOf,
  updatePolitician,
} from "./politicians";
import { recordProblem } from "./email";
import { logChange } from "./audit";

const PM = "regulate-letter-pm";
const BILL = "support-sobel-bill";
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

describe("politiciansSearch", () => {
  it("keeps what was typed, and filters by it", () => {
    expect(
      politiciansSearch({ q: "Jo", house: "lords", campaign: BILL, email: "blocked", sort: "party", dir: "desc" }),
    ).toEqual({
      q: "Jo",
      house: "lords",
      campaign: BILL,
      email: "blocked",
      sort: "party",
      dir: "desc",
      filter: { search: "Jo", house: "lords", campaign: BILL, emailBlocked: true, sort: { key: "party", dir: "desc" } },
    });
  });

  it("filters by nothing that's blank, missing or not a house", () => {
    const none = {
      search: undefined,
      house: undefined,
      campaign: undefined,
      emailBlocked: undefined,
      sort: { key: "name", dir: "asc" },
    };
    expect(politiciansSearch({})).toEqual({
      q: "",
      house: "",
      campaign: "",
      email: "",
      sort: "",
      dir: "",
      filter: none,
    });
    expect(politiciansSearch({ q: "", house: "hogwarts", campaign: "", email: "other", sort: "age" })).toEqual({
      q: "",
      house: "hogwarts",
      campaign: "",
      email: "other",
      sort: "age",
      dir: "",
      filter: none,
    });
  });
});

describeWithDatabase("politicians", () => {
  useTestDatabase();

  it("finds the sitting MP for a constituency, never one who has left or the test MP", async () => {
    const id = await addTestPolitician();
    await addTestPolitician({ airtableId: "rec1", name: "Old MP", constituency: "Ipswich", sitting: false });
    await addTestMp();
    expect(await findSittingMp("Cities of London and Westminster")).toEqual({
      id,
      name: "Polly Placeholder",
      salutation: "Ms Placeholder",
      constituency: "Cities of London and Westminster",
      email: "polly.placeholder.mp@parliament.uk",
      isTest: false,
      unreachable: false,
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
    await setStatus(id, BILL, { status: "signed", date: null, note: "" }, "jo@pauseai.uk");
    expect(await statusesOf(id)).toEqual({ [PM]: "signed", [BILL]: "signed" });

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
      { actor: "jo@pauseai.uk", action: "set status" },
      { actor: "jo@pauseai.uk", action: "set status" },
      { actor: "sam@pauseai.uk", action: "set status" },
    ]);
  });

  it("lists politicians, the test MP first, filtered by search, house and campaign", async () => {
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
    expect((await listPoliticians({ campaign: PM })).map((p) => p.id)).toEqual([peer]);
    expect(await listPoliticians({}, 1)).toHaveLength(1);
    expect((await listPoliticians({ search: "Polly" }))[0]).toEqual({
      id: mp,
      airtableId: "recPlaceholder",
      house: "commons",
      name: "Polly Placeholder",
      salutation: "Ms Placeholder",
      constituency: "Cities of London and Westminster",
      party: "Labour (Co-op)",
      email: "polly.placeholder.mp@parliament.uk",
      isTest: false,
      sitting: true,
      emailBlocked: false,
      letters: 0,
      replies: 0,
      statuses: {},
    });
  });

  it("counts the letters to each politician, leaving out those never sent, and how many were answered", async () => {
    const mp = await addTestPolitician();
    await query(
      `INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode, contact_consent, subject, reply_hash, status, replied_at)
       VALUES ('regulate-letter-pm', $1, 'A', 'a@example.com', 'x', 'ZZ9 9ZZ', false, 'S', 'a', 'sent', now()),
              ('regulate-letter-pm', $1, 'B', 'b@example.com', 'x', 'ZZ9 9ZZ', false, 'S', 'b', 'bounced', NULL),
              ('regulate-letter-pm', $1, 'C', 'c@example.com', 'x', 'ZZ9 9ZZ', false, 'S', 'c', 'not_sent', NULL)`,
      [mp],
    );
    expect(await getPolitician(mp)).toMatchObject({ letters: 2, replies: 1 });
    expect((await listPoliticians({ sort: { key: "letters", dir: "desc" } }))[0].id).toBe(mp);
  });

  it("knows whose address is blocked, whatever its case, and lists only them when asked", async () => {
    const mp = await addTestPolitician();
    await addPeer();
    await recordProblem({
      address: "Polly.Placeholder.MP@parliament.uk",
      messageId: null,
      kind: "hard",
      reason: "",
      canReset: true,
    });
    expect(await findSittingMp("Cities of London and Westminster")).toMatchObject({ unreachable: true });
    expect((await getPolitician(mp))!.emailBlocked).toBe(true);
    expect((await listPoliticians({ emailBlocked: true })).map((p) => p.id)).toEqual([mp]);
  });

  it("edits other signers, but not MPs from Parliament or the test MP", async () => {
    const peer = await addPeer();
    expect(await updatePolitician(peer, { ...PEER, party: "Labour" }, "sam@pauseai.uk")).toBe(true);
    expect((await getPolitician(peer))!.party).toBe("Labour");

    const mp = await addTestPolitician();
    const test = await addTestMp();
    expect(await updatePolitician(mp, PEER, "sam@pauseai.uk")).toBe(false);
    expect(await updatePolitician(test, PEER, "sam@pauseai.uk")).toBe(false);
    expect((await getPolitician(mp))!.name).toBe("Polly Placeholder");
    expect(await getPolitician(999)).toBeUndefined();

    const actions = await query<{ action: string }>("SELECT action FROM audit_log ORDER BY id");
    expect(actions.map((a) => a.action)).toEqual(["edit politician"]);
  });

  it("tells one politician's history from the audit log: edits, statuses, and their address blocked or unblocked, newest first", async () => {
    const peer = await addPeer();
    const mp = await addTestPolitician();
    await updatePolitician(peer, { ...PEER, party: "Labour" }, "sam@pauseai.uk");
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
    // As the imports log them: added, and no longer sitting.
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
