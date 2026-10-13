import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { AirtableRequestError, createLetterRecord, fetchFrontierLetterSignatories, fetchParliamentarian } from "./airtable";

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

describe("fetchFrontierLetterSignatories", () => {
  it("sends the exact filterByFormula, fields[], and auth header", async () => {
    const requests = serve({ records: [record({ "Full name or Title": "A", Party: "B", Constituency: "C" })] });

    await fetchFrontierLetterSignatories("test-token");

    expect(requests).toHaveLength(1);
    const url = new URL(requests[0].url);
    expect(url.hostname).toBe("api.airtable.com");
    expect(url.searchParams.get("filterByFormula")).toBe("{Signed Frontier AI Letter}=TRUE()");
    expect(url.searchParams.getAll("fields[]")).toEqual(["Full name or Title", "Party", "Constituency"]);
    expect(requests[0].headers.get("Authorization")).toBe("Bearer test-token");
  });

  it("only returns name/party/constituency even if Airtable sends extra fields", async () => {
    serve({
      records: [
        record({
          "Full name or Title": "Jane MP",
          Party: "Independent",
          Constituency: "Somewhere",
          "MP Email": "jane@parliament.uk",
          "Internal Notes": "do not publish",
        }),
      ],
    });

    const signatories = await fetchFrontierLetterSignatories("test-token");

    expect(signatories).toEqual([{ name: "Jane MP", party: "Independent", constituency: "Somewhere" }]);
    expect(Object.keys(signatories[0]).sort()).toEqual(["constituency", "name", "party"]);
  });

  it("falls back to empty string for missing fields on a record", async () => {
    serve({ records: [record({ "Full name or Title": "Solo" }), record({})] });

    const signatories = await fetchFrontierLetterSignatories("test-token");

    expect(signatories).toEqual([
      { name: "Solo", party: "", constituency: "" },
      { name: "", party: "", constituency: "" },
    ]);
  });

  it("paginates using the offset param until Airtable stops returning one", async () => {
    const requests = serve(
      { records: [record({ "Full name or Title": "First", Party: "P1", Constituency: "C1" })], offset: "offset-1" },
      { records: [record({ "Full name or Title": "Second", Party: "P2", Constituency: "C2" })] },
    );

    const signatories = await fetchFrontierLetterSignatories("test-token");

    expect(requests).toHaveLength(2);
    const secondUrl = new URL(requests[1].url);
    expect(secondUrl.searchParams.get("offset")).toBe("offset-1");
    expect(secondUrl.searchParams.get("filterByFormula")).toBe("{Signed Frontier AI Letter}=TRUE()");
    expect(signatories).toEqual([
      { name: "First", party: "P1", constituency: "C1" },
      { name: "Second", party: "P2", constituency: "C2" },
    ]);
  });

  it("throws AirtableRequestError when the Airtable request fails", async () => {
    server.use(http.get(AIRTABLE, () => new HttpResponse("nope", { status: 401 })));

    await expect(fetchFrontierLetterSignatories("test-token")).rejects.toBeInstanceOf(AirtableRequestError);
  });

  it("throws AirtableRequestError when the response has no records array", async () => {
    serve({ error: "something" });

    await expect(fetchFrontierLetterSignatories("test-token")).rejects.toThrow("missing records array");
  });

  it("gives up rather than looping forever on a repeating offset", async () => {
    let calls = 0;
    server.use(
      http.get(AIRTABLE, () => {
        calls++;
        return HttpResponse.json({ records: [], offset: "same" });
      }),
    );

    await expect(fetchFrontierLetterSignatories("test-token")).rejects.toThrow("pagination exceeded 100 pages");
    expect(calls).toBe(100);
  });

  it("reads the shared fixture by default", async () => {
    expect(await fetchFrontierLetterSignatories("t")).toEqual([
      { name: "Alex Example MP", party: "Independent", constituency: "Exampleton" },
      { name: "Sam Sample MP", party: "Example Party", constituency: "Sampleford" },
    ]);
  });
});

describe("fetchParliamentarian", () => {
  it("finds the MP by email, reading only the status field", async () => {
    const requests = serve({ records: [{ id: "recMp", fields: { "Signed Frontier AI Letter": true } }] });

    const found = await fetchParliamentarian("test-token", "jane.mp@parliament.uk");

    expect(found).toEqual({ recordId: "recMp", statuses: { "letter-to-the-prime-minister": "signed" } });
    const url = new URL(requests[0].url);
    expect(url.searchParams.get("filterByFormula")).toBe('{Email} = "jane.mp@parliament.uk"');
    expect(url.searchParams.getAll("fields[]")).toEqual(["Signed Frontier AI Letter"]);
    expect(requests[0].headers.get("Authorization")).toBe("Bearer test-token");
  });

  it("gives no statuses to an MP who hasn't signed, and nothing for an unknown MP", async () => {
    serve({ records: [{ id: "recMp", fields: {} }] }, {});
    expect(await fetchParliamentarian("t", "a@parliament.uk")).toEqual({ recordId: "recMp", statuses: {} });
    expect(await fetchParliamentarian("t", "b@parliament.uk")).toBeUndefined();
  });

  it("throws when Airtable fails", async () => {
    server.use(http.get(AIRTABLE, () => new HttpResponse(null, { status: 403 })));
    await expect(fetchParliamentarian("t", "a@parliament.uk")).rejects.toThrow(AirtableRequestError);
  });
});

describe("createLetterRecord", () => {
  const letter = {
    senderEmail: "jane@example.com",
    senderName: "Jane Smith",
    senderPostcode: "SW1A 1AA",
    mpRecordId: "recMp",
    subject: "Subject",
    message: "Letter",
    campaign: "Frontier AI letter",
    contactConsent: true,
  };

  it("adds the letter to the Emails table, linked to the MP", async () => {
    let request: Request | undefined;
    server.use(
      http.post(AIRTABLE, ({ request: r }) => {
        request = r;
        return HttpResponse.json({ id: "recLetter" });
      }),
    );

    expect(await createLetterRecord("write-token", letter)).toBe("recLetter");
    expect(new URL(request!.url).pathname).toBe("/v0/appBInVvIm6opJ1Ob/tblkzjrRHiZiqMDGR");
    expect(request!.headers.get("Authorization")).toBe("Bearer write-token");
    expect(await request!.json()).toEqual({
      typecast: true,
      fields: {
        "Sender email": "jane@example.com",
        "Sender name": "Jane Smith",
        "Sender postcode": "SW1A 1AA",
        Recipient: ["recMp"],
        Subject: "Subject",
        Message: "Letter",
        Campaign: "Frontier AI letter",
        "Contact consent": "Yes",
      },
    });
  });

  it("records a No for contact consent, and throws when Airtable fails", async () => {
    let body: { fields: Record<string, unknown> } | undefined;
    server.use(
      http.post(AIRTABLE, async ({ request }) => {
        body = (await request.json()) as typeof body;
        return new HttpResponse(null, { status: 422 });
      }),
    );
    await expect(createLetterRecord("t", { ...letter, contactConsent: false })).rejects.toThrow(AirtableRequestError);
    expect(body!.fields["Contact consent"]).toBe("No");
  });
});
