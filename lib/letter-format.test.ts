import { describe, expect, it } from "vitest";
import { doIUseEmail } from "@jsx-email/doiuse-email";
import { checkDoc, docFromMarkup, isBlank, linkHref, toHtml, toText, type LetterDoc } from "./letter-format";

const text = (value: string, ...marks: ("bold" | "italic")[]) =>
  marks.length ? { type: "text", text: value, marks: marks.map((type) => ({ type })) } : { type: "text", text: value };
const p = (...content: unknown[]) => (content.length ? { type: "paragraph", content } : { type: "paragraph" });
const list = (...items: unknown[][]) => ({
  type: "bulletList",
  content: items.map((content) => ({ type: "listItem", content })),
});
const doc = (...content: unknown[]) => ({ type: "doc", content }) as LetterDoc;
const linked = (value: string, href: string, ...marks: ("bold" | "italic")[]) => ({
  type: "text",
  text: value,
  marks: [...marks.map((type) => ({ type })), { type: "link", attrs: { href } }],
});
const quote = (...content: unknown[]) => ({ type: "blockquote", content });

describe("linkHref", () => {
  it("takes a web or email address as typed, or with what it lacks before it", () => {
    expect(linkHref(" https://pauseai.uk/join ")).toBe("https://pauseai.uk/join");
    expect(linkHref("http://example.org")).toBe("http://example.org/");
    expect(linkHref("pauseai.uk/campaigns")).toBe("https://pauseai.uk/campaigns");
    expect(linkHref("policy@pauseai.uk")).toBe("mailto:policy@pauseai.uk");
    expect(linkHref("mailto:policy@pauseai.uk?subject=Hi")).toBe("mailto:policy@pauseai.uk?subject=Hi");
  });

  it("refuses anything that isn't one", () => {
    for (const typed of [
      "",
      "  ",
      "javascript:alert(1)",
      "ftp://example.org",
      "hello",
      "two words.com",
      "https://",
      "data:text/html,x",
    ])
      expect(linkHref(typed), typed).toBeUndefined();
  });
});

describe("docFromMarkup", () => {
  it("makes paragraphs, bold, italic, line breaks and bullet lists", () => {
    expect(
      docFromMarkup("Dear **Ms Dummy**,\n\nI _really_ mean it.\nTruly.\n\n- one\n- **two**\n\n\n\nThanks"),
    ).toEqual(
      doc(
        p(text("Dear "), text("Ms Dummy", "bold"), text(",")),
        p(text("I "), text("really", "italic"), text(" mean it."), { type: "hardBreak" }, text("Truly.")),
        list([p(text("one"))], [p(text("two", "bold"))]),
        p(text("Thanks")),
      ),
    );
  });

  it("keeps an empty line as an empty paragraph, and skips blank parts", () => {
    expect(docFromMarkup("- a\nnot a bullet\n\n   ")).toEqual(
      doc(p(text("- a"), { type: "hardBreak" }, text("not a bullet"))),
    );
    expect(docFromMarkup("- ")).toEqual(doc(list([p()])));
  });

  it("takes a line of only spaces between paragraphs as a blank one", () => {
    expect(docFromMarkup("One. \n \nTwo.\n\t\n\nThree.")).toEqual(
      doc(p(text("One. ")), p(text("Two.")), p(text("Three."))),
    );
  });
});

describe("checkDoc", () => {
  it("accepts what the editor makes, and copies only what's allowed", () => {
    const fromEditor = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { textAlign: null },
          content: [{ type: "text", text: "Hi", marks: [{ type: "bold", attrs: {} }] }, { type: "hardBreak" }],
        },
        { type: "paragraph" },
        list([p(text("a")), list([p(text("b", "italic"))])], []),
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "site",
                  marks: [
                    {
                      type: "link",
                      attrs: { href: "https://pauseai.uk", target: "_blank", rel: "noopener", class: null },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(checkDoc(fromEditor)).toEqual(
      doc(
        p(text("Hi", "bold"), { type: "hardBreak" }),
        p(),
        list([p(text("a")), list([p(text("b", "italic"))])], []),
        // The link's address as linkHref writes it.
        quote(p(linked("site", "https://pauseai.uk/"))),
      ),
    );
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
      doc(p({ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] })),
      doc(p({ type: "text", text: "x", marks: [{ type: "link", attrs: { href: 5 } }] })),
      doc(p({ type: "text", text: "x", marks: [{ type: "link" }] })),
      doc(p({ type: "text", text: "x", marks: [{ type: "underline" }] })),
      doc(quote()),
      doc(quote({ type: "heading" })),
      doc(quote(quote(quote(quote(quote(quote(p(text("too deep"))))))))),
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
    p(text("Dear "), text('<Ms> & "Co"', "bold", "italic"), text(",")),
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

  it("links each email address in the HTML, and leaves the text as it is", () => {
    const signing = doc(
      p(text("Email policy@pauseai.uk. Or "), text("a.b+c@mail.example.org", "bold"), text(", not @ or x@y.")),
    );
    expect(toHtml(signing)).toBe(
      '<p>Email <a href="mailto:policy@pauseai.uk">policy@pauseai.uk</a>. Or <strong><a href="mailto:a.b+c@mail.example.org">a.b+c@mail.example.org</a></strong>, not @ or x@y.</p>',
    );
    expect(toText(signing)).toBe("Email policy@pauseai.uk. Or a.b+c@mail.example.org, not @ or x@y.");
  });

  it("writes links and quotes: in the HTML as themselves, in the text as the address and lines starting >", () => {
    const quoting = doc(
      p(
        text("See "),
        linked("our ", "https://pauseai.uk/join"),
        linked("form", "https://pauseai.uk/join", "bold"),
        text(", "),
        linked("pauseai.uk", "https://pauseai.uk/"),
        text(" or "),
        linked("policy@pauseai.uk", "mailto:policy@pauseai.uk"),
        text("."),
      ),
      quote(p(text("Said once,"), { type: "hardBreak" }, text("twice.")), p(), list([p(text("and listed"))])),
      list([quote(p(text("quoted in a list")))]),
    );
    expect(toHtml(quoting)).toBe(
      [
        '<p>See <a href="https://pauseai.uk/join">our </a><a href="https://pauseai.uk/join"><strong>form</strong></a>, <a href="https://pauseai.uk/">pauseai.uk</a> or <a href="mailto:policy@pauseai.uk">policy@pauseai.uk</a>.</p>',
        '<blockquote style="margin-left: 0; margin-right: 0; padding-left: 1em; border-left: 3px solid #ccc; color: #555;"><p>Said once,<br>twice.</p><p></p><ul><li><p>and listed</p></li></ul></blockquote>',
        '<ul><li><blockquote style="margin-left: 0; margin-right: 0; padding-left: 1em; border-left: 3px solid #ccc; color: #555;"><p>quoted in a list</p></blockquote></li></ul>',
      ].join("\n"),
    );
    expect(toText(quoting)).toBe(
      [
        "See our form (https://pauseai.uk/join), pauseai.uk or policy@pauseai.uk.",
        "",
        "> Said once,\n> twice.\n>\n>\n>\n> - and listed",
        "",
        "- > quoted in a list",
      ].join("\n"),
    );
    expect(isBlank(doc(quote(p(text(" ")))))).toBe(true);
  });

  it("writes plain text, with bullets as dashes", () => {
    expect(toText(letter)).toBe('Dear <Ms> & "Co",\n\n\n\n- one\n  more on one\n  - nested\n- two\n- \n\nName\nStreet');
  });

  it("knows a letter with no words in it", () => {
    expect(isBlank(doc(p(), list([p()]), p(text("  "))))).toBe(true);
    expect(isBlank(letter)).toBe(false);
  });
});

// Whether Gmail and Outlook can show a letter's HTML, from the Can I email
// tables (https://www.caniemail.com), through doiuse-email: their apps strip
// what they don't support, which a browser never shows. The letter uses only
// paragraphs, line breaks, bold, italic, bullet lists, links, and quotes
// with a few inline styles.
describe("the letter's HTML in Gmail and Outlook", () => {
  const CLIENTS = { emailClients: ["gmail.*", "outlook.*"] };

  it("uses nothing they don't support", () => {
    const letter = doc(
      p(text("Dear MP,"), { type: "hardBreak" }, text("bold", "bold"), text(" and "), text("italic", "italic")),
      p(text("To sign, email policy@pauseai.uk.")),
      list([p(text("a reason")), list([p(text("a reason inside it"))])]),
      p(linked("A link", "https://pauseai.uk/")),
      quote(p(text("A quote"))),
    );
    const result = doIUseEmail(toHtml(letter), CLIENTS);
    expect(result.success).toBe(true);
    // Lists are only "partly" supported: an <ol>'s reversed attribute and an
    // <li>'s value, neither of which a letter has.
    expect(new Set(result.warnings.map((warning) => warning.replace(/ by `.*`$/, "")))).toEqual(
      new Set(["`<ul>, <ol> and <dl>` is only partially supported"]),
    );
  });

  it("would catch what they don't support", () => {
    const result = doIUseEmail('<p style="display: flex">Dear MP,</p>', CLIENTS);
    expect(result.success).toBe(false);
  });
});
