import { afterEach, describe, expect, it, vi } from "vitest";
import { AirtableRequestError, fetchFrontierLetterSignatories } from "./airtable";

function airtableResponse(records: Record<string, unknown>[], offset?: string, status = 200) {
  return new Response(JSON.stringify({ records, offset }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function record(fields: Record<string, unknown>) {
  return { id: "rec1", createdTime: "2024-01-01T00:00:00.000Z", fields };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchFrontierLetterSignatories", () => {
  it("sends the exact filterByFormula, fields[], and auth header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      airtableResponse([record({ "Full name or Title": "A", Party: "B", Constituency: "C" })]),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchFrontierLetterSignatories("test-token");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [urlArg, init] = fetchMock.mock.calls[0];
    const url = new URL(String(urlArg));

    expect(url.hostname).toBe("api.airtable.com");
    expect(url.searchParams.get("filterByFormula")).toBe("{Signed Frontier AI Letter}=TRUE()");
    expect(url.searchParams.getAll("fields[]")).toEqual([
      "Full name or Title",
      "Party",
      "Constituency",
    ]);
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
  });

  it("only returns name/party/constituency even if Airtable sends extra fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      airtableResponse([
        record({
          "Full name or Title": "Jane MP",
          Party: "Independent",
          Constituency: "Somewhere",
          "MP Email": "jane@parliament.uk",
          "Internal Notes": "do not publish",
        }),
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const signatories = await fetchFrontierLetterSignatories("test-token");

    expect(signatories).toEqual([{ name: "Jane MP", party: "Independent", constituency: "Somewhere" }]);
    expect(Object.keys(signatories[0]).sort()).toEqual(["constituency", "name", "party"]);
  });

  it("falls back to empty string for missing fields on a record", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      airtableResponse([record({ "Full name or Title": "Solo" })]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const signatories = await fetchFrontierLetterSignatories("test-token");

    expect(signatories).toEqual([{ name: "Solo", party: "", constituency: "" }]);
  });

  it("paginates using the offset param until Airtable stops returning one", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        airtableResponse(
          [record({ "Full name or Title": "First", Party: "P1", Constituency: "C1" })],
          "offset-1",
        ),
      )
      .mockResolvedValueOnce(
        airtableResponse([record({ "Full name or Title": "Second", Party: "P2", Constituency: "C2" })]),
      );
    vi.stubGlobal("fetch", fetchMock);

    const signatories = await fetchFrontierLetterSignatories("test-token");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondUrl = new URL(String(fetchMock.mock.calls[1][0]));
    expect(secondUrl.searchParams.get("offset")).toBe("offset-1");
    expect(secondUrl.searchParams.get("filterByFormula")).toBe("{Signed Frontier AI Letter}=TRUE()");
    expect(signatories).toEqual([
      { name: "First", party: "P1", constituency: "C1" },
      { name: "Second", party: "P2", constituency: "C2" },
    ]);
  });

  it("throws AirtableRequestError when the Airtable request fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("nope", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchFrontierLetterSignatories("test-token")).rejects.toBeInstanceOf(
      AirtableRequestError,
    );
  });
});
