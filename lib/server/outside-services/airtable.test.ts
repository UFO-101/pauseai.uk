import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { AirtableRequestError, fetchMps, fetchSignatoriesForImport, MPS_FORMULA } from "./airtable";

const AIRTABLE = "https://api.airtable.com/v0/*";

function record(fields: Record<string, unknown>, id = "rec1") {
  return { id, createdTime: "2024-01-01T00:00:00.000Z", fields };
}

/** Serves `pages` in order and records each request. */
function serve(...pages: unknown[]) {
  const requests: Request[] = [];
  server.use(
    http.get(AIRTABLE, ({ request }) => {
      requests.push(request);
      return HttpResponse.json(pages[requests.length - 1] as object);
    }),
  );
  return requests;
}

describe("fetchSignatoriesForImport", () => {
  it("pages through everyone who signed, with only the fields it needs", async () => {
    const requests = serve(
      {
        records: [record({ "Full name or Title": "A", Email: " a@parliament.uk ", "Internal Notes": "not this" })],
        offset: "next",
      },
      {
        records: [record({ "Full name or Title": "B", Party: "P", Constituency: "C", Body: "House of Lords" }, "rec2")],
      },
    );

    expect(await fetchSignatoriesForImport("test-token")).toEqual([
      { airtableId: "rec1", name: "A", party: "", constituency: "", email: "a@parliament.uk", body: "" },
      { airtableId: "rec2", name: "B", party: "P", constituency: "C", email: "", body: "House of Lords" },
    ]);
    const url = new URL(requests[1].url);
    expect(url.hostname).toBe("api.airtable.com");
    expect(url.searchParams.get("offset")).toBe("next");
    expect(url.searchParams.get("filterByFormula")).toBe("{Signed Frontier AI Letter}=TRUE()");
    expect(url.searchParams.getAll("fields[]")).toEqual([
      "Full name or Title",
      "Party",
      "Constituency",
      "Email",
      "Body",
    ]);
    expect(requests[0].headers.get("Authorization")).toBe("Bearer test-token");
  });

  it("copes with a page without records, and a record without fields", async () => {
    serve({});
    expect(await fetchSignatoriesForImport("t")).toEqual([]);
    serve({ records: [record({})] });
    expect(await fetchSignatoriesForImport("t")).toEqual([
      { airtableId: "rec1", name: "", party: "", constituency: "", email: "", body: "" },
    ]);
  });

  it("throws on errors, or on endless paging", async () => {
    server.use(
      http.get(AIRTABLE, () =>
        HttpResponse.json(
          { error: { type: "UNKNOWN_FIELD_NAME", message: 'Unknown field name: "Salutation"' } },
          { status: 422 },
        ),
      ),
    );
    await expect(fetchSignatoriesForImport("t")).rejects.toThrow(AirtableRequestError);
    await expect(fetchSignatoriesForImport("t")).rejects.toThrow(
      'status 422: {"error":{"type":"UNKNOWN_FIELD_NAME","message":"Unknown field name: \\"Salutation\\""}}',
    );

    server.use(http.get(AIRTABLE, () => HttpResponse.json({ records: [], offset: "again" })));
    await expect(fetchSignatoriesForImport("t")).rejects.toThrow("exceeded 100 pages");
  });
});

describe("fetchMps", () => {
  it("reads the sitting MPs, with only the fields it needs, sorted by constituency", async () => {
    const requests = serve({
      records: [
        record(
          {
            "Full name or Title": "Zed",
            Salutation: "Mr Zed",
            Constituency: "Zetland",
            Party: "P",
            Email: "zed@parliament.uk ",
          },
          "recZ",
        ),
        record({ "Full name or Title": "Ann", Constituency: "Ashfield", Email: 5 }, "recA"),
      ],
    });

    expect(await fetchMps("t")).toEqual([
      { airtableId: "recA", name: "Ann", salutation: "", constituency: "Ashfield", party: "", email: null },
      {
        airtableId: "recZ",
        name: "Zed",
        salutation: "Mr Zed",
        constituency: "Zetland",
        party: "P",
        email: "zed@parliament.uk",
      },
    ]);
    const url = new URL(requests[0].url);
    expect(url.searchParams.get("filterByFormula")).toBe(MPS_FORMULA);
    expect(url.searchParams.getAll("fields[]")).toEqual([
      "Full name or Title",
      "Salutation",
      "Constituency",
      "Party",
      "Email",
    ]);
  });
});
