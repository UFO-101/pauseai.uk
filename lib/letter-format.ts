// A letter's formatting: paragraphs, bold, italic and bullet lists, and
// nothing else. In the HTML, an email address in the text is a mailto: link. The form's editor (Tiptap) sends its document as JSON; the
// server checks it against what's allowed here, then writes the HTML and the
// plain text itself, so nothing else can get into a letter.
//
// Campaign letters are written with a little markup (lib/content/
// email-your-mp.ts): a blank line between paragraphs (spaces on it are
// ignored), **bold**, _italic_, and
// lines starting "- " for a bullet list.

export type Mark = { type: "bold" | "italic" };
export type Inline = { type: "text"; text: string; marks?: Mark[] } | { type: "hardBreak" };
export type Paragraph = { type: "paragraph"; content?: Inline[] };
export type ListItem = { type: "listItem"; content: Block[] };
export type BulletList = { type: "bulletList"; content: ListItem[] };
export type Block = Paragraph | BulletList;
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
  const marks = Array.isArray(node.marks) ? node.marks : [];
  const kept = marks
    .filter((mark): mark is Mark => isObject(mark) && (mark.type === "bold" || mark.type === "italic"))
    .map((mark) => ({ type: mark.type }));
  if (kept.length !== marks.length) return undefined;
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
      // Escaping leaves an address as it was: it has no & < > or ".
      let html = escape(node.text).replace(EMAIL, (address) => `<a href="mailto:${address}">${address}</a>`);
      if (node.marks?.some((mark) => mark.type === "italic")) html = `<em>${html}</em>`;
      if (node.marks?.some((mark) => mark.type === "bold")) html = `<strong>${html}</strong>`;
      return html;
    })
    .join("");
}

function blockHtml(block: Block): string {
  if (block.type === "paragraph") return `<p>${inlineHtml(block.content)}</p>`;
  return `<ul>${block.content.map((item) => `<li>${item.content.map(blockHtml).join("")}</li>`).join("")}</ul>`;
}

/** The letter as HTML, built only from what's allowed. */
export function toHtml(doc: LetterDoc): string {
  return doc.content.map(blockHtml).join("\n");
}

function inlineText(inline: Inline[] = []): string {
  return inline.map((node) => (node.type === "hardBreak" ? "\n" : node.text)).join("");
}

function blockText(block: Block, indent: string): string {
  if (block.type === "paragraph") return inlineText(block.content);
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

/** The letter as plain text: paragraphs apart, bullets as "- ", without bold or italic. */
export function toText(doc: LetterDoc): string {
  return doc.content
    .map((block) => blockText(block, ""))
    .join("\n\n")
    .trim();
}

/** Whether the letter has any words in it. */
export function isBlank(doc: LetterDoc): boolean {
  return toText(doc).replace(/[-\s]/g, "") === "";
}
