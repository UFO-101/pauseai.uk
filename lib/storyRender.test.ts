import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "./storyRender";

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
    expect(sanitizeHtml('<a href=https://a.example/&quot;x>y</a>')).not.toContain('"x>');
  });
});
