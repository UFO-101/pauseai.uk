import { describe, expect, it } from "vitest";
import { toHtml, toText } from "./letter-format";
import { checkMailingDoc, conditionsIn, fieldsIn, isBlankMailing, letterFor, type MailingDoc } from "./mailing-doc";

const text = (value: string, ...marks: ("bold" | "italic")[]) =>
  marks.length ? { type: "text", text: value, marks: marks.map((type) => ({ type })) } : { type: "text", text: value };
const field = (id: string, ...marks: ("bold" | "italic")[]) =>
  marks.length
    ? { type: "field", attrs: { field: id }, marks: marks.map((type) => ({ type })) }
    : { type: "field", attrs: { field: id } };
const p = (...content: unknown[]) => (content.length ? { type: "paragraph", content } : { type: "paragraph" });
const list = (...items: unknown[][]) => ({
  type: "bulletList",
  content: items.map((content) => ({ type: "listItem", content })),
});
const onlyFor = (condition: string, ...content: unknown[]) => ({ type: "onlyFor", attrs: { condition }, content });
const doc = (...content: unknown[]) => ({ type: "doc", content }) as MailingDoc;

describe("checkMailingDoc", () => {
  it("accepts a letter's formatting, fields and parts for only some, copying only what's allowed", () => {
    const fromEditor = {
      type: "doc",
      content: [
        p({ ...field("salutation", "bold"), attrs: { field: "salutation", extra: 1 } }, text(",")),
        { ...onlyFor("ask:letter=signed", p(text("Thanks"))), attrs: { condition: "ask:letter=signed", x: 1 } },
        list([p(field("name"))]),
        p(),
      ],
    };
    expect(checkMailingDoc(fromEditor)).toEqual(
      doc(
        p(field("salutation", "bold"), text(",")),
        onlyFor("ask:letter=signed", p(text("Thanks"))),
        list([p(field("name"))]),
        p(),
      ),
    );
  });

  it.each([
    ["not a doc", "<p>hi</p>"],
    ["no content", { type: "doc" }],
    ["a field with no ID", doc(p({ type: "field", attrs: { field: "" } }))],
    ["a field with no attributes", doc(p({ type: "field" }))],
    ["a field marked as a link", doc(p({ type: "field", attrs: { field: "name" }, marks: [{ type: "link" }] }))],
    ["a part with no condition", doc({ type: "onlyFor", attrs: {}, content: [p()] })],
    ["a part with no attributes", doc({ type: "onlyFor", content: [p()] })],
    ["an empty part", doc(onlyFor("c"))],
    ["a part with no content", doc({ type: "onlyFor", attrs: { condition: "c" } })],
    ["a part in a part", doc(onlyFor("c", onlyFor("d", p())))],
    ["a part in a list", doc(list([onlyFor("c", p())]))],
    ["a heading", doc({ type: "heading", content: [] })],
    ["a list item that isn't one", doc({ type: "bulletList", content: [p()] })],
    ["a list item with no content", doc({ type: "bulletList", content: [{ type: "listItem" }] })],
    ["an empty list", doc({ type: "bulletList", content: [] })],
    ["content that isn't a list", doc({ type: "paragraph", content: "hi" })],
    ["a block that isn't an object", doc("hi")],
    ["lists nested without end", doc(list([list([list([list([list([list([p()])])])])])]))],
    ["an image", doc(p({ type: "image" }))],
  ])("refuses %s", (_, value) => {
    expect(checkMailingDoc(value)).toBeUndefined();
  });

  it("keeps a field with no marks as it is", () => {
    expect(checkMailingDoc(doc(p({ type: "field", attrs: { field: "name" }, marks: [] })))).toEqual(
      doc(p(field("name"))),
    );
  });
});

describe("fieldsIn and conditionsIn", () => {
  const letter = doc(
    p(field("salutation"), text(" "), field("name"), { type: "hardBreak" }),
    list([p(field("constituency")), list([p(field("party"))])]),
    onlyFor("signed", p(field("name")), list([p(field("house"))])),
    onlyFor("going", p()),
    onlyFor("signed", p()),
  );

  it("lists each field once, wherever it is", () => {
    expect(fieldsIn(letter)).toEqual(["salutation", "name", "constituency", "party", "house"]);
  });

  it("lists each condition once", () => {
    expect(conditionsIn(letter)).toEqual(["signed", "going"]);
  });
});

describe("letterFor", () => {
  const letter = doc(
    p(text("Dear "), field("salutation", "bold"), text(",")),
    onlyFor("signed", p(text("Thank you for signing.")), list([p(field("constituency"))])),
    list([p(text("One for "), field("name"))]),
    p(field("party")),
  );

  it("fills in each field and keeps the parts they're among those for", () => {
    const filled = letterFor(letter, {
      values: { salutation: "Ms Dummy", constituency: "Testshire", name: "Jo Dummy MP", party: "" },
      meets: ["signed"],
    });
    expect(toText(filled)).toBe("Dear Ms Dummy,\n\nThank you for signing.\n\n- Testshire\n\n- One for Jo Dummy MP");
    expect(toHtml(filled)).toContain("<strong>Ms Dummy</strong>");
  });

  it("leaves out the parts they aren't among those for, and a field they have no value for", () => {
    const filled = letterFor(letter, { values: { salutation: "Sir Test" }, meets: [] });
    expect(toText(filled)).toBe("Dear Sir Test,\n\n- One for");
    expect(filled.content.at(-1)).toEqual({ type: "paragraph" });
  });

  it("keeps a field's value without marks as plain text, and an empty paragraph", () => {
    expect(letterFor(doc(p(field("name")), p()), { values: { name: "Jo" }, meets: [] })).toEqual({
      type: "doc",
      content: [p(text("Jo")), p()],
    });
  });
});

describe("isBlankMailing", () => {
  it("is blank with only spaces and line breaks", () => {
    expect(isBlankMailing(doc(p(text("  "), { type: "hardBreak" }), list([p()])))).toBe(true);
  });

  it("isn't with words, or a field", () => {
    expect(isBlankMailing(doc(onlyFor("c", p(text("Hi")))))).toBe(false);
    expect(isBlankMailing(doc(p(field("name"))))).toBe(false);
  });
});
