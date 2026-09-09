import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

function post(body: string | object): Request {
  return new Request("https://pauseai.uk/api/csp-report", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** The report-uri wire format. */
function reportUriBody(overrides: Record<string, string> = {}) {
  return {
    "csp-report": {
      "document-uri": "https://pauseai.uk/campaigns",
      "violated-directive": "frame-src",
      "blocked-uri": "https://airtable.com/embed/abc",
      disposition: "report",
      ...overrides,
    },
  };
}

/** The report-to wire format. */
function reportToBody(overrides: Record<string, string> = {}) {
  return [
    {
      type: "csp-violation",
      body: {
        documentURL: "https://pauseai.uk/campaigns",
        effectiveDirective: "frame-src",
        blockedURL: "https://airtable.com/embed/abc",
        disposition: "report",
        ...overrides,
      },
    },
  ];
}

describe("POST /api/csp-report", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it("logs a report-uri violation", async () => {
    const res = await POST(post(reportUriBody()));

    expect(res.status).toBe(204);
    expect(warn).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(warn.mock.calls[0][1] as string);
    expect(logged).toMatchObject({
      documentUri: "https://pauseai.uk/campaigns",
      directive: "frame-src",
      blockedUri: "https://airtable.com/embed/abc",
    });
  });

  it("logs a report-to violation, which uses different field names", async () => {
    const res = await POST(post(reportToBody()));

    expect(res.status).toBe(204);
    expect(warn).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(warn.mock.calls[0][1] as string);
    expect(logged).toMatchObject({
      documentUri: "https://pauseai.uk/campaigns",
      directive: "frame-src",
      blockedUri: "https://airtable.com/embed/abc",
    });
  });

  it("ignores violations caused by browser extensions", async () => {
    // Extensions inject into every page and would otherwise drown the signal.
    for (const scheme of ["chrome-extension://abc/inject.js", "moz-extension://abc/inject.js"]) {
      await POST(post(reportUriBody({ "blocked-uri": scheme })));
    }

    expect(warn).not.toHaveBeenCalled();
  });

  it("truncates long fields instead of logging them whole", async () => {
    const long = `https://evil.example.com/${"a".repeat(5000)}`;
    await POST(post(reportUriBody({ "blocked-uri": long })));

    const logged = JSON.parse(warn.mock.calls[0][1] as string);
    expect(logged.blockedUri.length).toBeLessThan(400);
    expect(logged.blockedUri.endsWith("…")).toBe(true);
  });

  it("drops an oversized body without parsing it", async () => {
    const res = await POST(post("x".repeat(100_000)));

    expect(res.status).toBe(204);
    expect(warn).not.toHaveBeenCalled();
  });

  it("survives malformed input", async () => {
    for (const body of ["not json", "null", "[]", "{}", '{"csp-report":"nope"}', '[{"body":123}]']) {
      const res = await POST(post(body));
      expect(res.status).toBe(204);
    }

    expect(warn).not.toHaveBeenCalled();
  });

  it("ignores non-CSP report types sent to the same endpoint", async () => {
    // The Reporting API multiplexes deprecation and intervention reports
    // through the same transport.
    await POST(post([{ type: "deprecation", body: { id: "someFeature" } }]));

    expect(warn).not.toHaveBeenCalled();
  });
});
