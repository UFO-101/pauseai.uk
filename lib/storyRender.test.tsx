import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  avatarFallback,
  bulletText,
  initials,
  isBulletLine,
  parseCssStyle,
  renderBody,
  sanitizeHtml,
} from "./storyRender";

describe("sanitizeHtml", () => {
  it("keeps the formatting tags stories actually use", () => {
    expect(sanitizeHtml("I read <em>If Anyone Builds It, Everyone Dies</em>.")).toBe(
      "I read <em>If Anyone Builds It, Everyone Dies</em>.",
    );
    expect(sanitizeHtml("<strong>bold</strong> and <b>b</b> and <i>i</i><br>")).toBe(
      "<strong>bold</strong> and <b>b</b> and <i>i</i><br>",
    );
  });

  it("strips attributes from allowed tags", () => {
    expect(sanitizeHtml('<em onmouseover="alert(1)" class="x">hi</em>')).toBe("<em>hi</em>");
  });

  it("drops disallowed tags but keeps their text, escaped", () => {
    expect(sanitizeHtml("<script>alert(1)</script>")).toBe("alert(1)");
    expect(sanitizeHtml('<img src=x onerror="alert(1)">')).toBe("");
    expect(sanitizeHtml("<div><em>kept</em></div>")).toBe("<em>kept</em>");
  });

  it("escapes stray angle brackets and ampersands", () => {
    expect(sanitizeHtml("5 < 6 & 7 > 3")).toBe("5 &lt; 6 &amp; 7 &gt; 3");
  });

  it("allows http, https and mailto links, hardened with rel", () => {
    expect(sanitizeHtml('<a href="https://pauseai.uk">x</a>')).toBe(
      '<a href="https://pauseai.uk" target="_blank" rel="noreferrer">x</a>',
    );
    expect(sanitizeHtml("<a href='mailto:hello@pauseai.uk'>x</a>")).toBe(
      '<a href="mailto:hello@pauseai.uk" target="_blank" rel="noreferrer">x</a>',
    );
  });

  it("reads unquoted hrefs, and keeps a link with no href as plain text", () => {
    expect(sanitizeHtml("<a href=https://pauseai.uk>x</a>")).toBe(
      '<a href="https://pauseai.uk" target="_blank" rel="noreferrer">x</a>',
    );
    expect(sanitizeHtml("<a>x</a>")).toBe("<a>x</a>");
  });

  it("neutralises unsafe hrefs without leaking the closing tag", () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">click</a>')).toBe("<a>click</a>");
    expect(sanitizeHtml('<a href="//evil.example">click</a>')).toBe("<a>click</a>");
  });

  it("escapes the remainder when a '>' inside an attribute truncates the tag", () => {
    // The tag matcher stops at the first ">", so everything after it is text.
    // It must come out escaped rather than as live markup.
    expect(sanitizeHtml('<a href="data:text/html,<script>">click</a>')).toBe('<a>"&gt;click</a>');
  });

  it("escapes quotes inside an href so the attribute can't be broken out of", () => {
    expect(sanitizeHtml("<a href=https://a.example/&quot;x>y</a>")).not.toContain('"x>');
  });
});

describe("parseCssStyle", () => {
  it("turns a style string into camel-cased React style", () => {
    expect(parseCssStyle("background-position: 50% 20%; background-size:cover;")).toEqual({
      backgroundPosition: "50% 20%",
      backgroundSize: "cover",
    });
  });

  it("skips declarations without a colon", () => {
    expect(parseCssStyle("nonsense; color: red")).toEqual({ color: "red" });
    expect(parseCssStyle("")).toEqual({});
  });
});

describe("initials and avatarFallback", () => {
  it("takes up to two initials", () => {
    expect(initials("jane  doe smith")).toBe("JD");
    expect(initials("Cher")).toBe("C");
  });

  it("shows initials for a name, and the pause symbol for anonymous stories", () => {
    expect(avatarFallback("Jane Doe")).toBe("JD");
    for (const name of [undefined, "", "   "]) {
      const html = renderToStaticMarkup(<>{avatarFallback(name)}</>);
      expect(html).toContain("Pause-Symbol.svg");
    }
  });
});

describe("bullets", () => {
  it("recognises lines starting with a dash and strips it", () => {
    expect(isBulletLine("  - item")).toBe(true);
    expect(isBulletLine("-not a bullet")).toBe(false);
    expect(bulletText(" - item ")).toBe("item");
  });
});

describe("renderBody", () => {
  const paragraphs = ["First <em>para</em>.", "- one", "- <b>two</b>", "Last."];

  it("groups consecutive bullets into a list, as sanitised HTML", () => {
    expect(renderToStaticMarkup(<>{renderBody(paragraphs, true)}</>)).toBe(
      "<p>First <em>para</em>.</p><ul><li>one</li><li><b>two</b></li></ul><p>Last.</p>",
    );
  });

  it("renders plain text, escaping any markup", () => {
    expect(renderToStaticMarkup(<>{renderBody(paragraphs, false)}</>)).toBe(
      "<p>First &lt;em&gt;para&lt;/em&gt;.</p><ul><li>one</li><li>&lt;b&gt;two&lt;/b&gt;</li></ul><p>Last.</p>",
    );
  });

  it("handles a story that ends with a list", () => {
    expect(renderToStaticMarkup(<>{renderBody(["- a"], false)}</>)).toBe("<ul><li>a</li></ul>");
  });
});
