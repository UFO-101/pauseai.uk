import { describe, expect, it } from "vitest";
import { checkDoc, docFromMarkup, isBlank, toHtml, toText, type LetterDoc } from "./letter-format";

const text = (value: string, ...marks: ("bold" | "italic")[]) => (marks.length ? { type: "text", text: value, marks: marks.map((type) => ({ type })) } : { type: "text", text: value });
const p = (...content: unknown[]) => (content.length ? { type: "paragraph", content } : { type: "paragraph" });
const list = (...items: unknown[][]) => ({ type: "bulletList", content: items.map((content) => ({ type: "listItem", content })) });
const doc = (...content: unknown[]) => ({ type: "doc", content }) as LetterDoc;

describe("docFromMarkup", () => {
  it("makes paragraphs, bold, italic, line breaks and bullet lists", () => {
    expect(docFromMarkup("Dear **Ms Dummy**,\n\nI _really_ mean it.\nTruly.\n\n- one\n- **two**\n\n\n\nThanks")).toEqual(
      doc(
        p(text("Dear "), text("Ms Dummy", "bold"), text(",")),
        p(text("I "), text("really", "italic"), text(" mean it."), { type: "hardBreak" }, text("Truly.")),
        list([p(text("one"))], [p(text("two", "bold"))]),
        p(text("Thanks")),
      ),
    );
  });

  it("keeps an empty line as an empty paragraph, and skips blank parts", () => {
    expect(docFromMarkup("- a\nnot a bullet\n\n   ")).toEqual(doc(p(text("- a"), { type: "hardBreak" }, text("not a bullet"))));
    expect(docFromMarkup("- ")).toEqual(doc(list([p()])));
  });
});

describe("checkDoc", () => {
  it("accepts what the editor makes, and copies only what's allowed", () => {
    const fromEditor = {
      type: "doc",
      content: [
        { type: "paragraph", attrs: { textAlign: null }, content: [{ type: "text", text: "Hi", marks: [{ type: "bold", attrs: {} }] }, { type: "hardBreak" }] },
        { type: "paragraph" },
        list([p(text("a")), list([p(text("b", "italic"))])], []),
      ],
    };
    expect(checkDoc(fromEditor)).toEqual(doc(p(text("Hi", "bold"), { type: "hardBreak" }), p(), list([p(text("a")), list([p(text("b", "italic"))])], [])));
  });

  it("refuses anything else", () => {
    const refused: unknown[] = [
      null,
      "Dear MP",
      { type: "doc" },
      { type: "paragraph", content: [] },
      doc({ type: "heading", content: [text("Hi")] }),
      doc(null),
      doc({ type: "paragraph", content: "Hi" }),
      doc(p(text("Hi"), { type: "image" })),
      doc(p(null)),
      doc(p({ type: "text", text: 5 })),
      doc(p({ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "https://example.org" } }] })),
      doc(p({ type: "text", text: "x", marks: [null] })),
      doc({ type: "bulletList", content: [] }),
      doc({ type: "bulletList", content: [{ type: "paragraph" }] }),
      doc({ type: "bulletList", content: [{ type: "listItem", content: "x" }] }),
      doc({ type: "bulletList", content: [{ type: "listItem", content: [{ type: "heading" }] }] }),
      doc(list([list([list([list([list([list([p(text("too deep"))])])])])])])),
    ];
    for (const value of refused) expect(checkDoc(value), JSON.stringify(value)).toBeUndefined();
    expect(checkDoc(doc(list([list([list([list([list([p(text("deep enough"))])])])])])))).toBeDefined();
  });
});

describe("toHtml and toText", () => {
  const letter = doc(
    p(text("Dear "), text("<Ms> & \"Co\"", "bold", "italic"), text(",")),
    p(),
    list([p(text("one")), p(text("more on one")), list([p(text("nested"))])], [p(text("two"))], []),
    p(text("Name"), { type: "hardBreak" }, text("Street")),
  );

  it("writes HTML from only what's allowed, escaped", () => {
    expect(toHtml(letter)).toBe(
      [
        "<p>Dear <strong><em>&lt;Ms&gt; &amp; &quot;Co&quot;</em></strong>,</p>",
        "<p></p>",
        "<ul><li><p>one</p><p>more on one</p><ul><li><p>nested</p></li></ul></li><li><p>two</p></li><li></li></ul>",
        "<p>Name<br>Street</p>",
      ].join("\n"),
    );
  });

  it("writes plain text, with bullets as dashes", () => {
    expect(toText(letter)).toBe('Dear <Ms> & "Co",\n\n\n\n- one\n  more on one\n  - nested\n- two\n- \n\nName\nStreet');
  });

  it("knows a letter with no words in it", () => {
    expect(isBlank(doc(p(), list([p()]), p(text("  "))))).toBe(true);
    expect(isBlank(letter)).toBe(false);
  });
});
