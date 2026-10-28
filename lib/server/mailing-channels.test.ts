import { describe, expect, it } from "vitest";
import { mailingChannel, postmarkEmail } from "./mailing-channels";

describe("postmarkEmail", () => {
  const message = {
    from: { name: "Jo", address: "jo@pauseai.uk" },
    to: "a@b.c",
    subject: "",
    html: "",
    text: "",
    attachments: [],
  };

  it("sends test copies, not mailings, with no limit, at no cost", async () => {
    expect(postmarkEmail.sendsMailings).toBe(false);
    expect(await postmarkEmail.remainingToday("jo@pauseai.uk")).toBeNull();
    expect(postmarkEmail.cost(message)).toBe(0);
  });

  it("reads a bounce of a message it sent as a report on it, and nothing else", () => {
    expect(postmarkEmail.report({ RecordType: "Bounce", MessageID: "m-1", Email: "a@b.c", Inactive: true })).toEqual({
      messageId: "m-1",
      kind: "bounced",
    });
    expect(postmarkEmail.report({ RecordType: "Bounce", Email: "a@b.c" })).toBeUndefined();
    expect(postmarkEmail.report({ RecordType: "Delivery", MessageID: "m-1" })).toBeUndefined();
  });
});

describe("mailingChannel", () => {
  it("sends email by Postmark, and has nothing yet for texts or WhatsApp", () => {
    expect(mailingChannel("email")).toBe(postmarkEmail);
    expect(mailingChannel("text")).toBeUndefined();
    expect(mailingChannel("whatsapp")).toBeUndefined();
  });
});
