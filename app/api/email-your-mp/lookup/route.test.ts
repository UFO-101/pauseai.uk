import { expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { copy } from "@/lib/content/email-your-mp";
import { recordProblem } from "@/lib/server/email";
import { setStatus } from "@/lib/server/politicians";
import { addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { POST } from "./route";

function lookup(body: unknown) {
  return POST(new Request("http://localhost/api/email-your-mp/lookup", { method: "POST", body: JSON.stringify(body) }));
}

describeWithDatabase("POST /api/email-your-mp/lookup", () => {
  useTestDatabase();

  it("returns the MP and their statuses", async () => {
    const id = await addTestPolitician();
    await setStatus(id, "regulate-letter-pm", { status: "signed", date: null, note: "" }, "jo@pauseai.uk");
    const res = await lookup({ postcode: "SW1A 1AA" });
    expect(await res.json()).toEqual({
      ok: true,
      mp: {
        id,
        name: "Polly Placeholder",
        salutation: "Ms Placeholder",
        constituency: "Cities of London and Westminster",
        email: "polly.placeholder.mp@parliament.uk",
        isTest: false,
        unreachable: false,
      },
      statuses: { "regulate-letter-pm": "signed" },
      place: { latitude: 51.501009, longitude: -0.141588 },
    });
  });

  it("gives no email for an MP whose address is blocked", async () => {
    await addTestPolitician();
    await recordProblem({
      address: "polly.placeholder.mp@parliament.uk",
      messageId: null,
      kind: "hard",
      reason: "",
      canReset: true,
    });
    expect(await (await lookup({ postcode: "SW1A 1AA" })).json()).toMatchObject({
      ok: true,
      mp: { email: null, unreachable: true },
    });
  });

  it("says it doesn't know where the postcode is, if postcodes.io doesn't", async () => {
    await addTestPolitician();
    server.use(
      http.get("https://api.postcodes.io/postcodes/:postcode", () =>
        HttpResponse.json({ result: { parliamentary_constituency: "Cities of London and Westminster" } }),
      ),
    );
    expect(await (await lookup({ postcode: "SW1A 1AA" })).json()).toMatchObject({ ok: true, place: null });
  });

  it("explains a postcode it can't place", async () => {
    const res = await lookup({ postcode: "XX1 1XX" });
    expect(await res.json()).toEqual({ ok: false, message: copy.lookup.notFound });
  });

  it("needs a postcode", async () => {
    const res = await POST(new Request("http://localhost/x", { method: "POST", body: "not json" }));
    expect(res.status).toBe(400);
    expect((await lookup({ postcode: 5 })).status).toBe(400);
  });
});
