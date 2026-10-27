import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import {
  AIRTABLE_ASKS,
  AirtableRequestError,
  EMAILS_FORMULA,
  fetchEmails,
  fetchGoToParliamentMeetings,
  fetchMembers,
  fetchPoliticians,
  fetchWebFormLetters,
  GO_TO_PARLIAMENT_FORMULA,
  MEMBER_FIELDS,
  MEMBERS_FORMULA,
  POLITICIAN_FIELDS,
  POLITICIANS_FORMULA,
} from "./airtable";

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

describe("fetchPoliticians", () => {
  it("pages through every politician but the test records, with only the fields it needs, by name", async () => {
    const requests = serve(
      {
        records: [
          record(
            {
              "Full name or Title": "Zed MSP",
              Salutation: "Mr Zedson",
              Email: " zed@parliament.example ",
              Body: "Scottish Parliament",
              Constituency: "Zetland",
              Party: "P",
              Country: "Scotland",
              Notes: "Met once.",
              Recommended: true,
              "Important target": true,
              "Personal connection": true,
              "Signed Frontier AI Letter": true,
              "Signed DeepMind Letter": true,
              "ControlAI Signatory": true,
              "Edinburgh Conference November 2026": "Passed on request",
              "Internal Notes": "not this",
            },
            "recZ",
          ),
        ],
        offset: "next",
      },
      {
        records: [
          // A peer: no Body, no constituency, only their title.
          record({ "Full name or Title": "Lord Ann", Status: "Died" }, "recA"),
          // Someone with a constituency but no Body, and every answer to the conference.
          record({ "Full name or Title": "Bea", Constituency: "Bury", Status: "Retired" }, "recB"),
          record({ "Full name or Title": "Cy", Body: "Welsh Parliament", Status: "No longer in office" }, "recC"),
          record(
            {
              "Full name or Title": "Di",
              Body: "Northern Ireland Assembly",
              "Edinburgh Conference November 2026": "Going",
            },
            "recD",
          ),
          record(
            {
              "Full name or Title": "Ed",
              Body: "House of Commons",
              Notes: " Just notes ",
              "Edinburgh Conference November 2026": "Declined",
            },
            "recE",
          ),
          record(
            {
              "Full name or Title": "Flo",
              Body: "House of Lords",
              Recommended: true,
              "Signed Frontier AI Letter": false,
            },
            "recF",
          ),
        ],
      },
    );
    const records = await fetchPoliticians("test-token");
    expect(records.map((r) => r.politician.airtableId)).toEqual([
      "recB",
      "recC",
      "recD",
      "recE",
      "recF",
      "recA",
      "recZ",
    ]);
    const by = (id: string) => records.find((r) => r.politician.airtableId === id)!;
    expect(by("recZ")).toEqual({
      politician: {
        airtableId: "recZ",
        name: "Zed MSP",
        salutation: "Mr Zedson",
        email: "zed@parliament.example",
        status: "in_office",
        house: "scottish-parliament",
        constituency: "Zetland",
        party: "P",
        country: "scotland",
        notes: "Met once.\nRecommended",
        importantTarget: true,
        personalConnection: true,
      },
      statuses: {
        "frontier-ai-letter": "signed",
        "deepmind-letter": "signed",
        "controlai-statement": "signed",
        "edinburgh-conference-2026": "passed_on",
      },
    });
    expect(by("recA")).toEqual({
      politician: {
        airtableId: "recA",
        name: "Lord Ann",
        salutation: "",
        email: null,
        status: "died",
        house: "lords",
        constituency: null,
        party: "",
        country: null,
        notes: "",
        importantTarget: false,
        personalConnection: false,
      },
      statuses: {},
    });
    expect(
      records.map((r) => [r.politician.airtableId, r.politician.house, r.politician.status, r.politician.notes]),
    ).toEqual([
      ["recB", "other", "retired", ""],
      ["recC", "senedd", "left_office", ""],
      ["recD", "ni-assembly", "in_office", ""],
      ["recE", "commons", "in_office", "Just notes"],
      ["recF", "lords", "in_office", "Recommended"],
      ["recA", "lords", "died", ""],
      ["recZ", "scottish-parliament", "in_office", "Met once.\nRecommended"],
    ]);
    expect(by("recD").statuses).toEqual({ "edinburgh-conference-2026": "going" });
    expect(by("recE").statuses).toEqual({ "edinburgh-conference-2026": "declined" });
    expect(by("recF").statuses).toEqual({});
    const url = new URL(requests[1].url);
    expect(url.hostname).toBe("api.airtable.com");
    expect(url.pathname).toBe("/v0/appBInVvIm6opJ1Ob/tblH3ks9wqQHLpYx3");
    expect(url.searchParams.get("offset")).toBe("next");
    expect(url.searchParams.get("filterByFormula")).toBe(POLITICIANS_FORMULA);
    expect(POLITICIANS_FORMULA).toBe("NOT({Test})");
    expect(url.searchParams.getAll("fields[]")).toEqual([...POLITICIAN_FIELDS]);
    expect(requests[0].headers.get("Authorization")).toBe("Bearer test-token");
    expect(AIRTABLE_ASKS).toEqual([
      "frontier-ai-letter",
      "deepmind-letter",
      "controlai-statement",
      "edinburgh-conference-2026",
    ]);
  });

  it("refuses a Status, Country or answer it doesn't know, rather than guess", async () => {
    serve({ records: [record({ "Full name or Title": "X", Status: "Suspended" })] });
    await expect(fetchPoliticians("t")).rejects.toThrow('Unknown Status "Suspended" on rec1');
    serve({ records: [record({ "Full name or Title": "X", Country: "Cornwall" })] });
    await expect(fetchPoliticians("t")).rejects.toThrow('Unknown Country "Cornwall" on rec1');
    serve({ records: [record({ "Full name or Title": "X", "Edinburgh Conference November 2026": "Maybe" })] });
    await expect(fetchPoliticians("t")).rejects.toThrow('Unknown Edinburgh Conference November 2026 "Maybe" on rec1');
  });

  it("copes with a page without records", async () => {
    serve({});
    expect(await fetchPoliticians("t")).toEqual([]);
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
    await expect(fetchPoliticians("t")).rejects.toThrow(AirtableRequestError);
    await expect(fetchPoliticians("t")).rejects.toThrow(
      'status 422: {"error":{"type":"UNKNOWN_FIELD_NAME","message":"Unknown field name: \\"Salutation\\""}}',
    );

    server.use(http.get(AIRTABLE, () => HttpResponse.json({ records: [], offset: "again" })));
    await expect(fetchPoliticians("t")).rejects.toThrow("exceeded 100 pages");
  });
});

describe("fetchEmails", () => {
  it("reads the 2026 emails, with the tick boxes of the mailings it's given", async () => {
    const requests = serve({
      records: [
        record(
          {
            Timestamp: "2026-10-01T10:00:00.000Z",
            "UK Parliamentarian": ["recP", 5],
            Personalized: true,
            "Box A": true,
            "Box B": false,
          },
          "recE1",
        ),
        record({ Timestamp: "2026-06-01T10:00:00.000Z", "UK Parliamentarian": "recP" }, "recE2"),
      ],
    });
    expect(await fetchEmails("t", ["Box A", "Box B"])).toEqual([
      {
        airtableId: "recE1",
        at: "2026-10-01T10:00:00.000Z",
        politicians: ["recP"],
        personalised: true,
        mailings: ["Box A"],
      },
      {
        airtableId: "recE2",
        at: "2026-06-01T10:00:00.000Z",
        politicians: [],
        personalised: false,
        mailings: [],
      },
    ]);
    const url = new URL(requests[0].url);
    expect(url.pathname).toBe("/v0/appBInVvIm6opJ1Ob/tblp4nH5Jymq48rcm");
    expect(url.searchParams.get("filterByFormula")).toBe(EMAILS_FORMULA);
    expect(url.searchParams.getAll("fields[]")).toEqual([
      "Timestamp",
      "UK Parliamentarian",
      "Personalized",
      "Box A",
      "Box B",
    ]);
  });
});

describe("fetchWebFormLetters", () => {
  it("reads every letter in the old form's table, never the message, and a blank or No consent as no", async () => {
    const requests = serve({
      records: [
        record(
          {
            "Sender name": " Wendy ",
            "Sender email": "wendy@example.com",
            "Sender postcode": "EC1A 1BB",
            Recipient: ["recP"],
            Subject: "Please",
            Campaign: "Frontier AI letter",
            "Form Submitted Timestamp": "2026-09-25T09:00:00.000Z",
            "Email Sent Time": "2026-09-25T09:01:00.000Z",
            "Contact consent": "Yes",
            Message: "never this",
          },
          "recW1",
        ),
        record({ Spam: true, "Invalid, can't send": true, "Contact consent": "No" }, "recW2"),
      ],
    });
    expect(await fetchWebFormLetters("t")).toEqual([
      {
        airtableId: "recW1",
        senderName: "Wendy",
        senderEmail: "wendy@example.com",
        senderPostcode: "EC1A 1BB",
        recipients: ["recP"],
        subject: "Please",
        campaign: "Frontier AI letter",
        submittedAt: "2026-09-25T09:00:00.000Z",
        sentAt: "2026-09-25T09:01:00.000Z",
        spam: false,
        invalid: false,
        consent: true,
      },
      {
        airtableId: "recW2",
        senderName: "",
        senderEmail: "",
        senderPostcode: "",
        recipients: [],
        subject: "",
        campaign: "",
        submittedAt: null,
        sentAt: null,
        spam: true,
        invalid: true,
        consent: false,
      },
    ]);
    const url = new URL(requests[0].url);
    expect(url.pathname).toBe("/v0/appBInVvIm6opJ1Ob/tblkzjrRHiZiqMDGR");
    expect(url.searchParams.getAll("fields[]")).not.toContain("Message");
    expect(url.searchParams.getAll("fields[]")).not.toContain("Attending Parliament 23 June 2026");
  });
});

describe("fetchGoToParliamentMeetings", () => {
  it("reads only each guest's MP and their meeting's status, never the guest", async () => {
    const requests = serve({
      records: [record({ "UK Parliamentarians": ["recP"], "MP Meeting Status": "Secured", email: "no@example.com" })],
    });
    expect(await fetchGoToParliamentMeetings("t")).toEqual([{ politicians: ["recP"], status: "Secured" }]);
    const url = new URL(requests[0].url);
    expect(url.pathname).toBe("/v0/appBInVvIm6opJ1Ob/tblminXS1xSuBbEjz");
    expect(url.searchParams.get("filterByFormula")).toBe(GO_TO_PARLIAMENT_FORMULA);
    expect(url.searchParams.getAll("fields[]")).toEqual(["UK Parliamentarians", "MP Meeting Status"]);
  });
});

describe("fetchMembers", () => {
  it("reads the UK members we may hold from the members table, with only the fields we keep", async () => {
    const requests = serve({
      records: [
        record(
          {
            "Full name": " Jane Example ",
            Email: " Jane@Example.com ",
            Phone: "+447700900123",
            City: "Manchester",
            "Zip code": "M1 1AE",
            "Joined Datetime": "2026-09-12",
            "Created Datetime": "2026-09-12T10:00:00.000Z",
            "Last Modified": "2026-09-13T10:00:00.000Z",
            "Email subscription": true,
            "GDPR chapter share permission": true,
            "Source page": "pauseai.uk",
            Intent: "Volunteer",
            Bio: "not this",
          },
          "recJane",
        ),
      ],
    });

    expect(await fetchMembers("t")).toEqual([
      {
        id: "recJane",
        email: "jane@example.com",
        name: "Jane Example",
        phone: "+447700900123",
        city: "Manchester",
        postcode: "M1 1AE",
        joinedAt: "2026-09-12T10:00:00.000Z",
        createdAt: "2026-09-12T10:00:00.000Z",
        keepInformed: true,
        sharePermission: true,
        sourcePage: "pauseai.uk",
        intent: "Volunteer",
        modifiedAt: "2026-09-13T10:00:00.000Z",
      },
    ]);
    const url = new URL(requests[0].url);
    expect(url.pathname).toBe("/v0/appWPTGqZmUcs3NWu/tblL1icZBhTV1gQ9o");
    expect(url.searchParams.get("filterByFormula")).toBe(MEMBERS_FORMULA);
    expect(url.searchParams.getAll("fields[]")).toEqual([...MEMBER_FIELDS]);
  });

  it("dates a re-join from its first day, counts the old field's No as unticked, and skips a record with no email", async () => {
    serve({
      records: [
        record(
          {
            Email: "a@example.com",
            "Joined Datetime": "2024-03-23",
            "Created Datetime": "2026-07-02T08:00:00.000Z",
            "Last Modified": "2026-07-02T08:00:00.000Z",
            "Email subscription": true,
            "Email subscription (old)": "No",
          },
          "recA",
        ),
        record({ "Created Datetime": "2026-07-02T08:00:00.000Z" }, "recNoEmail"),
        record({ Email: "b@example.com", "Created Datetime": "2026-07-03T08:00:00.000Z" }, "recB"),
      ],
    });

    expect(await fetchMembers("t")).toEqual([
      {
        id: "recA",
        email: "a@example.com",
        name: "",
        phone: null,
        city: null,
        postcode: null,
        joinedAt: "2024-03-23T00:00:00.000Z",
        createdAt: "2026-07-02T08:00:00.000Z",
        keepInformed: false,
        sharePermission: false,
        sourcePage: null,
        intent: null,
        modifiedAt: "2026-07-02T08:00:00.000Z",
      },
      expect.objectContaining({ id: "recB", joinedAt: "2026-07-03T08:00:00.000Z", keepInformed: false }),
    ]);
  });
});
