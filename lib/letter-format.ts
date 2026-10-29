// A letter's formatting: paragraphs, bold, italic, links, bullet lists and
// quotes, and nothing else. A link goes to a web page or an email address
// (LINK_SCHEMES). In the HTML, an email address in the text that isn't a
// link already is a mailto: link. The form's editor (Tiptap) sends its document as JSON; the
// server checks it against what's allowed here, then writes the HTML and the
// plain text itself, so nothing else can get into a letter.
//
// Campaign letters are written with a little markup (lib/content/
// email-your-mp.ts): a blank line between paragraphs (spaces on it are
// ignored), **bold**, _italic_, and
// lines starting "- " for a bullet list.

export type Mark = { type: "bold" | "italic" } | { type: "link"; attrs: { href: string } };
export type Inline = { type: "text"; text: string; marks?: Mark[] } | { type: "hardBreak" };
export type Paragraph = { type: "paragraph"; content?: Inline[] };
export type ListItem = { type: "listItem"; content: Block[] };
export type BulletList = { type: "bulletList"; content: ListItem[] };
export type Blockquote = { type: "blockquote"; content: Block[] };
export type Block = Paragraph | BulletList | Blockquote;

/** What a link may go to: a web page, or an email address. */
const LINK_SCHEMES = ["http:", "https:", "mailto:"];

/**
 * What a link typed in goes to, as an address a letter may link to: as
 * typed, or with https:// before a bare site ("pauseai.uk/join"), or
 * mailto: before an email address. Undefined for anything else.
 */
export function linkHref(typed: string): string | undefined {
  const text = typed.trim();
  if (!text || /\s/.test(text)) return undefined;
  const whole = /^[a-z][a-z0-9+.-]*:/i.test(text)
    ? text
    : /^[^@/]+@[^@/]+\.[a-z]{2,}$/i.test(text)
      ? `mailto:${text}`
      : `https://${text}`;
  let url: URL;
  try {
    url = new URL(whole);
  } catch {
    return undefined;
  }
  if (!LINK_SCHEMES.includes(url.protocol)) return undefined;
  // A web address needs a host with a dot in it, so a word typed by mistake isn't a link.
  if (url.protocol !== "mailto:" && !url.hostname.includes(".")) return undefined;
  return url.protocol === "mailto:" ? whole : url.href;
}

/** A node's marks, if each is one a letter may have, with nothing else kept of them and a link's address as linkHref() writes it; undefined if any isn't. */
export function checkMarks(value: unknown): Mark[] | undefined {
  const marks = Array.isArray(value) ? value : [];
  const kept = marks.map((mark): Mark | undefined => {
    if (!isObject(mark)) return undefined;
    if (mark.type === "bold" || mark.type === "italic") return { type: mark.type };
    if (mark.type !== "link" || !isObject(mark.attrs) || typeof mark.attrs.href !== "string") return undefined;
    const href = linkHref(mark.attrs.href);
    return href ? { type: "link", attrs: { href } } : undefined;
  });
  return kept.every(Boolean) ? (kept as Mark[]) : undefined;
}

/** Where a node's link goes, if it's in one. */
export function linkOf(marks: Mark[] | undefined): string | undefined {
  const link = marks?.find((mark) => mark.type === "link");
  return link?.type === "link" ? link.attrs.href : undefined;
}
export type LetterDoc = { type: "doc"; content: Block[] };

const BOLD_OR_ITALIC = /\*\*(.+?)\*\*|_(.+?)_/g;

function inlineFromMarkup(line: string): Inline[] {
  const inline: Inline[] = [];
  let last = 0;
  for (const match of line.matchAll(BOLD_OR_ITALIC)) {
    if (match.index > last) inline.push({ type: "text", text: line.slice(last, match.index) });
    inline.push({ type: "text", text: match[1] ?? match[2], marks: [{ type: match[1] ? "bold" : "italic" }] });
    last = match.index + match[0].length;
  }
  if (last < line.length) inline.push({ type: "text", text: line.slice(last) });
  return inline;
}

/** Lines, with a hard break between each. */
function lines(text: string[]): Inline[] {
  return text.flatMap((line, i) =>
    i === 0 ? inlineFromMarkup(line) : [{ type: "hardBreak" } as Inline, ...inlineFromMarkup(line)],
  );
}

/** A campaign's letter, written with the markup above, as the editor's document. */
export function docFromMarkup(markup: string): LetterDoc {
  const content = markup
    .split(/\n[ \t]*\n\s*/)
    .filter((part) => part.trim())
    .map((part): Block => {
      const partLines = part.split("\n");
      if (partLines.every((line) => line.startsWith("- "))) {
        return {
          type: "bulletList",
          content: partLines.map((line) => ({
            type: "listItem",
            content: [paragraph(inlineFromMarkup(line.slice(2)))],
          })),
        };
      }
      return paragraph(lines(partLines));
    });
  return { type: "doc", content };
}

export function paragraph(content: Inline[]): Paragraph {
  return content.length > 0 ? { type: "paragraph", content } : { type: "paragraph" };
}

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** One inline node of a letter, if it's text or a line break with only the marks allowed. */
export function checkInline(node: unknown): Inline | undefined {
  if (!isObject(node)) return undefined;
  if (node.type === "hardBreak") return { type: "hardBreak" };
  if (node.type !== "text" || typeof node.text !== "string") return undefined;
  const kept = checkMarks(node.marks);
  if (!kept) return undefined;
  return kept.length > 0 ? { type: "text", text: node.text, marks: kept } : { type: "text", text: node.text };
}

function checkBlock(node: unknown, depth: number): Block | undefined {
  if (!isObject(node)) return undefined;
  const content = node.content === undefined ? [] : node.content;
  if (!Array.isArray(content)) return undefined;
  if (node.type === "paragraph") {
    const inline = content.map(checkInline);
    return inline.every(Boolean) ? paragraph(inline as Inline[]) : undefined;
  }
  // Lists in lists, but not without end.
  if (node.type === "bulletList" && depth < 5) {
    const items = content.map((item): ListItem | undefined => {
      if (!isObject(item) || item.type !== "listItem" || !Array.isArray(item.content)) return undefined;
      const blocks = item.content.map((block) => checkBlock(block, depth + 1));
      return blocks.every(Boolean) ? { type: "listItem", content: blocks as Block[] } : undefined;
    });
    return items.every(Boolean) && items.length > 0 ? { type: "bulletList", content: items as ListItem[] } : undefined;
  }
  if (node.type === "blockquote" && depth < 5) {
    const blocks = content.map((block) => checkBlock(block, depth + 1));
    return blocks.every(Boolean) && blocks.length > 0 ? { type: "blockquote", content: blocks as Block[] } : undefined;
  }
  return undefined;
}

/** The editor's document, if it holds only what a letter may: otherwise undefined. */
export function checkDoc(value: unknown): LetterDoc | undefined {
  if (!isObject(value) || value.type !== "doc" || !Array.isArray(value.content)) return undefined;
  const blocks = value.content.map((block) => checkBlock(block, 0));
  return blocks.every(Boolean) ? { type: "doc", content: blocks as Block[] } : undefined;
}

// An email address: what's before the @, then dot-separated labels ending in
// a top-level domain, so a full stop after it ends the sentence, not the address.
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inlineHtml(inline: Inline[] = []): string {
  return inline
    .map((node) => {
      if (node.type === "hardBreak") return "<br>";
      const href = linkOf(node.marks);
      // Escaping leaves an address as it was: it has no & < > or ".
      let html = href
        ? escape(node.text)
        : escape(node.text).replace(EMAIL, (address) => `<a href="mailto:${address}">${address}</a>`);
      if (node.marks?.some((mark) => mark.type === "italic")) html = `<em>${html}</em>`;
      if (node.marks?.some((mark) => mark.type === "bold")) html = `<strong>${html}</strong>`;
      return href ? `<a href="${escape(href)}">${html}</a>` : html;
    })
    .join("");
}

/**
 * A quote's look in an email, inline as email needs: a rule down its left,
 * its text set in from it. Gmail and Outlook only partly support `margin`,
 * so only its sides are set, leaving the space above and below a quote's own.
 */
const QUOTE_STYLE = "margin-left: 0; margin-right: 0; padding-left: 1em; border-left: 3px solid #ccc; color: #555;";

function blockHtml(block: Block): string {
  if (block.type === "paragraph") return `<p>${inlineHtml(block.content)}</p>`;
  if (block.type === "blockquote")
    return `<blockquote style="${QUOTE_STYLE}">${block.content.map(blockHtml).join("")}</blockquote>`;
  return `<ul>${block.content.map((item) => `<li>${item.content.map(blockHtml).join("")}</li>`).join("")}</ul>`;
}

/** The letter as HTML, built only from what's allowed. */
export function toHtml(doc: LetterDoc): string {
  return doc.content.map(blockHtml).join("\n");
}

/** A link's text, then where it goes in brackets, unless the text says that already. */
function linkText(text: string, href: string): string {
  return [href, href.replace(/^mailto:/, ""), href.replace(/^https?:\/\//, "").replace(/\/$/, "")].includes(text)
    ? text
    : `${text} (${href})`;
}

/** The text of a paragraph's line, each link's text followed by where it goes; a link split by bold or italic is one link. */
function inlineText(inline: Inline[] = []): string {
  const runs: { text: string; href?: string }[] = [];
  for (const node of inline) {
    const text = node.type === "hardBreak" ? "\n" : node.text;
    const href = node.type === "text" ? linkOf(node.marks) : undefined;
    const last = runs.at(-1);
    if (last && last.href === href) last.text += text;
    else runs.push({ text, href });
  }
  return runs.map((run) => (run.href ? linkText(run.text, run.href) : run.text)).join("");
}

function blockText(block: Block, indent: string): string {
  if (block.type === "paragraph") return inlineText(block.content);
  // Unindented, as a paragraph is: in a list, its line follows the bullet.
  if (block.type === "blockquote") {
    return block.content
      .map((inner) => blockText(inner, ""))
      .join("\n\n")
      .split("\n")
      .map((line) => (line ? `> ${line}` : ">"))
      .join("\n");
  }
  return block.content
    .map((item) => {
      const [first, ...rest] = item.content.map((inner) => blockText(inner, `${indent}  `));
      return [
        `${indent}- ${first ?? ""}`,
        ...rest.map((text) => (text.startsWith(`${indent}  -`) ? text : `${indent}  ${text}`)),
      ].join("\n");
    })
    .join("\n");
}

/** The letter as plain text: paragraphs apart, bullets as "- ", quotes' lines starting "> ", links' addresses in brackets, without bold or italic. */
export function toText(doc: LetterDoc): string {
  return doc.content
    .map((block) => blockText(block, ""))
    .join("\n\n")
    .trim();
}

/** Whether the letter has any words in it. */
export function isBlank(doc: LetterDoc): boolean {
  // Without the dashes of bullets and the > of quotes.
  return toText(doc).replace(/[-\s>]/g, "") === "";
}
