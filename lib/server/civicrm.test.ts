import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { logLetterSent } from "./civicrm";

const CIVI = "https://crm.example.org/civicrm/ajax/api4/:entity/:action";
const LETTER = {
  id: 9,
  campaign: "letter-to-the-prime-minister",
  senderName: "Jane Q Smith",
  senderEmail: "jane@example.com",
  contactConsent: true,
  subject: "Please sign",
  mpName: "Rachel Blake",
  mpEmail: "rachel.blake.mp@parliament.uk",
};

type Call = { path: string; params: Record<string, unknown>; auth: string | null };

/** CiviCRM that answers each Entity/action from `answers`, recording each call. */
function civicrm(answers: Record<string, () => Response>) {
  const calls: Call[] = [];
  server.use(
    http.post(CIVI, async ({ request, params }) => {
      const path = `${params.entity}/${params.action}`;
      const form = new URLSearchParams(await request.text());
      calls.push({ path, params: JSON.parse(form.get("params")!), auth: request.headers.get("X-Civi-Auth") });
      return answers[path]();
    }),
  );
  return calls;
}

beforeEach(() => {
  vi.stubEnv("CIVICRM_URL", "https://crm.example.org/");
  vi.stubEnv("CIVICRM_API_KEY", "key-1");
  vi.stubEnv("CIVICRM_ACTIVITY_TYPE", "Letter to MP");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("logLetterSent", () => {
  it("logs an activity on the sender's existing contact", async () => {
    const calls = civicrm({
      "Email/get": () => HttpResponse.json({ values: [{ contact_id: 42 }] }),
      "Activity/create": () => HttpResponse.json({ values: [{ id: 1 }] }),
    });

    expect(await logLetterSent(LETTER)).toBe(true);

    expect(calls.map((c) => c.path)).toEqual(["Email/get", "Activity/create"]);
    expect(calls[0].auth).toBe("Bearer key-1");
    expect(calls[0].params).toEqual({ select: ["contact_id"], where: [["email", "=", "jane@example.com"]], limit: 1 });
    expect(calls[1].params.values).toMatchObject({
      "activity_type_id:name": "Letter to MP",
      "status_id:name": "Completed",
      source_contact_id: 42,
      target_contact_id: [42],
      subject: "Please sign (to Rachel Blake)",
    });
    expect((calls[1].params.values as { details: string }).details).toContain("Contact consent: yes");
  });

  it("makes a contact for a new sender", async () => {
    const calls = civicrm({
      "Email/get": () => HttpResponse.json({ values: [] }),
      "Contact/create": () => HttpResponse.json({ values: [{ id: 7 }] }),
      "Activity/create": () => HttpResponse.json({ values: [{ id: 1 }] }),
    });

    expect(await logLetterSent({ ...LETTER, contactConsent: false })).toBe(true);

    expect(calls[1].params).toMatchObject({
      values: { contact_type: "Individual", first_name: "Jane", last_name: "Q Smith" },
      chain: { email: ["Email", "create", { values: { contact_id: "$id", email: "jane@example.com", is_primary: true } }] },
    });
    expect(calls[2].params.values).toMatchObject({ source_contact_id: 7 });
    expect((calls[2].params.values as { details: string }).details).toContain("Contact consent: no");
  });

  it("reports failure without throwing", async () => {
    civicrm({ "Email/get": () => HttpResponse.json({ error_message: "Authorization failed" }, { status: 401 }) });
    expect(await logLetterSent(LETTER)).toBe(false);
    civicrm({ "Email/get": () => new HttpResponse("<html>", { status: 200 }) });
    expect(await logLetterSent(LETTER)).toBe(false);
  });

  it("does nothing until CiviCRM is set up", async () => {
    vi.stubEnv("CIVICRM_ACTIVITY_TYPE", "");
    expect(await logLetterSent(LETTER)).toBe(false);
  });
});
