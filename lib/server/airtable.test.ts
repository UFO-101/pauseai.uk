import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { AirtableRequestError, fetchSignatoriesForImport } from "./airtable";

const AIRTABLE = "https://api.airtable.com/v0/*";

function record(fields: Record<string, unknown>) {
  return { id: "rec1", createdTime: "2024-01-01T00:00:00.000Z", fields };
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
      { records: [record({ "Full name or Title": "A", Email: "a@parliament.uk", "Internal Notes": "not this" })], offset: "next" },
      { records: [record({ "Full name or Title": "B", Party: "P", Constituency: "C" })] },
    );

    expect(await fetchSignatoriesForImport("test-token")).toEqual([
      { name: "A", party: "", constituency: "", email: "a@parliament.uk" },
      { name: "B", party: "P", constituency: "C", email: "" },
    ]);
    const url = new URL(requests[1].url);
    expect(url.hostname).toBe("api.airtable.com");
    expect(url.searchParams.get("offset")).toBe("next");
    expect(url.searchParams.get("filterByFormula")).toBe("{Signed Frontier AI Letter}=TRUE()");
    expect(url.searchParams.getAll("fields[]")).toEqual(["Full name or Title", "Party", "Constituency", "Email"]);
    expect(requests[0].headers.get("Authorization")).toBe("Bearer test-token");
  });

  it("copes with a page without records, and a record without fields", async () => {
    serve({});
    expect(await fetchSignatoriesForImport("t")).toEqual([]);
    serve({ records: [record({})] });
    expect(await fetchSignatoriesForImport("t")).toEqual([{ name: "", party: "", constituency: "", email: "" }]);
  });

  it("throws on errors, or on endless paging", async () => {
    server.use(http.get(AIRTABLE, () => new HttpResponse(null, { status: 500 })));
    await expect(fetchSignatoriesForImport("t")).rejects.toThrow(AirtableRequestError);

    server.use(http.get(AIRTABLE, () => HttpResponse.json({ records: [], offset: "again" })));
    await expect(fetchSignatoriesForImport("t")).rejects.toThrow("exceeded 100 pages");
  });
});
