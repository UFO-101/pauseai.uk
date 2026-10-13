import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import {
  changeCount,
  compareMps,
  emailFrom,
  fetchCurrentMps,
  MEMBERS_API,
  salutationFor,
  toSyncedMp,
  type SyncedMp,
} from "./parliament";

const getJson = (url: string) => fetch(url).then((res) => res.json());

const member = {
  id: 1,
  nameDisplayAs: "Jack Abbott",
  nameListAs: "Abbott, Jack",
  nameAddressAs: null,
  gender: "M",
  latestParty: { name: "Labour" },
  latestHouseMembership: { membershipFrom: "Ipswich" },
};

describe("emailFrom", () => {
  it("prefers the parliamentary office, and trims the address", () => {
    expect(
      emailFrom([
        { typeId: 4, email: "constituency@example.org" },
        { typeId: 1, email: "office@parliament.uk " },
      ]),
    ).toBe("office@parliament.uk");
  });

  it("falls back to any address, or none", () => {
    expect(emailFrom([{ typeId: 6, email: null }, { typeId: 4, email: " " }, { typeId: 4, email: "c@example.org" }])).toBe("c@example.org");
    expect(emailFrom([{ typeId: 1, email: null }, {}])).toBeNull();
  });
});

describe("salutationFor", () => {
  it("uses Parliament's when there is one", () => {
    expect(salutationFor({ ...member, nameAddressAs: " Ms Abbott " })).toBe("Ms Abbott");
  });

  it("otherwise builds one from the name", () => {
    expect(salutationFor(member)).toBe("Mr Abbott");
    expect(salutationFor({ ...member, gender: "F", nameListAs: "Blake, Rachel" })).toBe("Ms Blake");
    expect(salutationFor({ ...member, nameListAs: "Duncan Smith, Sir Iain" })).toBe("Sir Iain");
    expect(salutationFor({ ...member, gender: "F", nameListAs: "Hodge, Dame Margaret" })).toBe("Dame Margaret");
    expect(salutationFor({ ...member, gender: null })).toBe("Jack Abbott");
    expect(salutationFor({ ...member, gender: null, nameListAs: "Cher" })).toBe("Jack Abbott");
  });
});

describe("toSyncedMp", () => {
  it("copies what we keep", () => {
    expect(toSyncedMp(member, [{ typeId: 1, email: "jack.abbott.mp@parliament.uk" }])).toEqual({
      parliamentId: 1,
      name: "Jack Abbott",
      salutation: "Mr Abbott",
      constituency: "Ipswich",
      party: "Labour",
      email: "jack.abbott.mp@parliament.uk",
    });
    expect(toSyncedMp({ ...member, latestParty: null }, []).party).toBe("");
  });
});

describe("fetchCurrentMps", () => {
  it("reads every sitting MP and their contacts, sorted by constituency", async () => {
    const mps = await fetchCurrentMps(getJson);
    expect(mps.map((mp) => [mp.constituency, mp.email])).toEqual([
      ["Cities of London and Westminster", "mp5257.office@parliament.uk"],
      ["Hackney North and Stoke Newington", "mp172.office@parliament.uk"],
    ]);
  });

  it("pages through the list, 20 at a time, and asks only for sitting MPs", async () => {
    const searches: URL[] = [];
    const page = (n: number, from: number) => Array.from({ length: n }, (_, i) => ({ value: { ...member, id: from + i } }));
    server.use(
      http.get(`${MEMBERS_API}/Members/Search`, ({ request }) => {
        const url = new URL(request.url);
        searches.push(url);
        const skip = Number(url.searchParams.get("skip"));
        return HttpResponse.json({ items: skip === 0 ? page(20, 0) : page(5, 20), totalResults: 25 });
      }),
      http.get(`${MEMBERS_API}/Members/:id/Contact`, () => HttpResponse.json({})),
    );

    const mps = await fetchCurrentMps(getJson);

    expect(mps).toHaveLength(25);
    expect(searches.map((url) => url.searchParams.get("skip"))).toEqual(["0", "20"]);
    expect(searches[0].searchParams.get("House")).toBe("1");
    expect(searches[0].searchParams.get("IsCurrentMember")).toBe("true");
    expect(searches[0].searchParams.get("take")).toBe("20");
  });

  it("stops at a full last page, and when totalResults is missing", async () => {
    const full = Array.from({ length: 20 }, (_, i) => ({ value: { ...member, id: i } }));
    let calls = 0;
    server.use(
      http.get(`${MEMBERS_API}/Members/Search`, () => {
        calls++;
        return HttpResponse.json({ items: full });
      }),
      http.get(`${MEMBERS_API}/Members/:id/Contact`, () => HttpResponse.json({ value: [] })),
    );
    expect(await fetchCurrentMps(getJson)).toHaveLength(20);
    expect(calls).toBe(1);
  });

  it("gives up on a response without items, or one that never stops", async () => {
    server.use(http.get(`${MEMBERS_API}/Members/Search`, () => HttpResponse.json({})));
    await expect(fetchCurrentMps(getJson)).rejects.toThrow("no items");

    const full = Array.from({ length: 20 }, (_, i) => ({ value: { ...member, id: i } }));
    server.use(http.get(`${MEMBERS_API}/Members/Search`, () => HttpResponse.json({ items: full, totalResults: 100000 })));
    await expect(fetchCurrentMps(getJson)).rejects.toThrow("past 60 pages");
  });

  it("copes with no MPs at all", async () => {
    server.use(http.get(`${MEMBERS_API}/Members/Search`, () => HttpResponse.json({ items: [], totalResults: 0 })));
    expect(await fetchCurrentMps(getJson)).toEqual([]);
  });
});

describe("compareMps", () => {
  const mp = (id: number, email = "a@parliament.uk"): SyncedMp => ({
    parliamentId: id,
    name: `MP ${id}`,
    salutation: "Mr A",
    constituency: `Seat ${id}`,
    party: "P",
    email,
  });

  it("finds who joined, who left and whose details changed", () => {
    const changes = compareMps([mp(1), mp(2), mp(3)], [mp(1), mp(2, "new@parliament.uk"), mp(4)]);
    expect(changes).toEqual({ added: [mp(4)], removed: [mp(3)], changed: [mp(2, "new@parliament.uk")] });
    expect(changeCount(changes)).toBe(3);
    expect(changeCount(compareMps([mp(1)], [mp(1)]))).toBe(0);
  });
});
