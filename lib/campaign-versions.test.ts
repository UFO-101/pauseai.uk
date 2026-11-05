import { expect, it } from "vitest";
import { campaignTextDoc } from "./campaign-versions";

it("makes a campaign's names merge fields, in and around its words", () => {
  const doc = campaignTextDoc("Dear {salutation}\n\nOf {constituency} **and** me.\n\n- a point");
  expect(doc.content[0]).toEqual({
    type: "paragraph",
    content: [
      { type: "text", text: "Dear " },
      { type: "field", attrs: { field: "salutation" } },
    ],
  });
  const second = doc.content[1] as { content: { type: string }[] };
  expect(second.content[1]).toEqual({ type: "field", attrs: { field: "constituency" } });
  expect(doc.content[2].type).toBe("bulletList");
  expect(campaignTextDoc("{name}").content[0]).toEqual({
    type: "paragraph",
    content: [{ type: "field", attrs: { field: "name" } }],
  });
  expect(campaignTextDoc("a\nb").content[0]).toEqual({
    type: "paragraph",
    content: [{ type: "text", text: "a" }, { type: "hardBreak" }, { type: "text", text: "b" }],
  });
});
