import { afterEach, describe, expect, it, vi } from "vitest";
import { markSent, readDraft, readLookup, readSent, saveDraft, saveLookup, type Draft } from "./draft";

const DRAFT: Draft = {
  campaign: "regulate-letter-pm",
  name: "Jane Smith",
  postcode: "SW1A 1AA",
  mp: {
    name: "Polly Placeholder",
    salutation: "Ms Placeholder",
    constituency: "Cities of London and Westminster",
    email: "polly@example.org",
  },
  statuses: {},
  email: "jane@example.com",
  address: "1 High St",
  subject: "A subject",
  letter: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }] },
  nickname: "",
};

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe("draft", () => {
  it("is kept for its campaign's pages, however often it's read", () => {
    expect(saveDraft(DRAFT)).toBe(true);
    expect(readDraft("regulate-letter-pm")).toEqual(DRAFT);
    expect(readDraft("regulate-letter-pm")).toEqual(DRAFT);
    expect(readDraft("support-sobel-bill")).toBeNull();
  });

  it("is dropped by a new lookup, which is kept for its campaign's pages, and for the campaign pages to fill in", () => {
    saveDraft(DRAFT);
    const lookup = {
      campaign: "support-sobel-bill",
      name: "Jane Smith",
      address: "1 High St",
      postcode: "SW1A 1AA",
      mp: DRAFT.mp,
      statuses: {},
      movedFrom: "regulate-letter-pm",
    };
    expect(saveLookup(lookup)).toBe(true);
    expect(readDraft("regulate-letter-pm")).toBeNull();
    expect(readLookup("support-sobel-bill")).toEqual(lookup);
    expect(readLookup("regulate-letter-pm")).toBeNull();
    expect(readLookup()).toEqual(lookup);
  });

  it("goes once it's sent, leaving the MP's name for the sent page", () => {
    saveDraft(DRAFT);
    expect(readSent("regulate-letter-pm")).toBeNull();
    markSent({ campaign: "regulate-letter-pm", mpName: "Polly Placeholder" });
    expect(readDraft("regulate-letter-pm")).toBeNull();
    expect(readSent("regulate-letter-pm")).toEqual({ campaign: "regulate-letter-pm", mpName: "Polly Placeholder" });
    expect(readSent("support-sobel-bill")).toBeNull();
  });

  it("copes with a browser that won't store anything, or something that isn't JSON", () => {
    sessionStorage.setItem("email-your-mp-draft", "{not json");
    expect(readDraft("regulate-letter-pm")).toBeNull();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(saveDraft(DRAFT)).toBe(false);
    expect(
      saveLookup({ campaign: "regulate-letter-pm", name: "", address: "", postcode: "", mp: DRAFT.mp, statuses: {} }),
    ).toBe(false);
    expect(() => markSent({ campaign: "regulate-letter-pm", mpName: "Polly Placeholder" })).not.toThrow();
  });
});
