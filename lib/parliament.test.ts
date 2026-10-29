import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { fetchCurrentMps, MEMBERS_API } from "./parliament";

const getJson = (url: string) => fetch(url).then((res) => res.json());

const member = { id: 1, nameDisplayAs: "Ian Instance", latestHouseMembership: { membershipFrom: "Ipswich" } };

describe("fetchCurrentMps", () => {
  it("reads every sitting MP and their emails, trimmed", async () => {
    expect(await fetchCurrentMps(getJson)).toEqual([
      {
        parliamentId: 90001,
        name: "Ms Dora Dummy",
        constituency: "Hackney North and Stoke Newington",
        emails: ["mp90001.office@parliament.uk"],
      },
      {
        parliamentId: 90002,
        name: "Polly Placeholder",
        constituency: "Cities of London and Westminster",
        emails: ["mp90002.office@parliament.uk"],
      },
      {
        parliamentId: 90003,
        name: "Mo Example",
        constituency: "Manchester Central",
        emails: ["mp90003.office@parliament.uk"],
      },
    ]);
  });

  it("keeps each email once, and skips contacts without one", async () => {
    server.use(
      http.get(`${MEMBERS_API}/Members/Search`, () =>
        HttpResponse.json({ items: [{ value: member }], totalResults: 1 }),
      ),
      http.get(`${MEMBERS_API}/Members/1/Contact`, () =>
        HttpResponse.json({
          value: [
            { email: "a@parliament.uk" },
            { email: " a@parliament.uk " },
            { email: null },
            {},
            { email: "b@example.org" },
          ],
        }),
      ),
    );
    expect((await fetchCurrentMps(getJson))[0].emails).toEqual(["a@parliament.uk", "b@example.org"]);
  });

  it("pages through the list, 20 at a time, and asks only for sitting MPs", async () => {
    const searches: URL[] = [];
    const page = (n: number, from: number) =>
      Array.from({ length: n }, (_, i) => ({ value: { ...member, id: from + i } }));
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
    server.use(
      http.get(`${MEMBERS_API}/Members/Search`, () => HttpResponse.json({ items: full, totalResults: 100000 })),
    );
    await expect(fetchCurrentMps(getJson)).rejects.toThrow("past 60 pages");
  });

  it("copes with no MPs at all", async () => {
    server.use(http.get(`${MEMBERS_API}/Members/Search`, () => HttpResponse.json({ items: [], totalResults: 0 })));
    expect(await fetchCurrentMps(getJson)).toEqual([]);
  });
});
