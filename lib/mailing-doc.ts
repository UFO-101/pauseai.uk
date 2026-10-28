import { checkInline, isObject, paragraph, type Block, type Inline, type LetterDoc, type Mark } from "./letter-format";

// A mailing's letter: a letter's formatting (lib/letter-format.ts), with
// merge fields, filled in with each recipient's values, and parts only
// some recipients get, those who meet the part's condition. The editor
// (MailingEditor) sends it as JSON; the server checks it here, and writes
// each recipient's letter from it, as a plain letter, so the HTML and
// text come from letter-format alone.

/** A merge field: an ID, such as "salutation", which each recipient has a value for. */
export type FieldNode = { type: "field"; attrs: { field: string }; marks?: Mark[] };
export type MailingInline = Inline | FieldNode;
export type MailingParagraph = { type: "paragraph"; content?: MailingInline[] };
export type MailingListItem = { type: "listItem"; content: MailingBlock[] };
export type MailingBulletList = { type: "bulletList"; content: MailingListItem[] };
export type MailingBlock = MailingParagraph | MailingBulletList;
/**
 * A part only those who meet `condition` get, or with NOT_CONDITION before
 * it, only those who don't. Only at the top level: a part isn't in a part.
 */
export type OnlyForNode = { type: "onlyFor"; attrs: { condition: string }; content: MailingBlock[] };
export type MailingDoc = { type: "doc"; content: (MailingBlock | OnlyForNode)[] };

/** An empty letter, to start from. */
export const EMPTY_MAILING_DOC: MailingDoc = { type: "doc", content: [{ type: "paragraph" }] };

/** The mark before a condition for a part only those who don't meet it get. */
export const NOT_CONDITION = "!";

/** Whether a recipient gets a part for `condition`: they meet it, or for one marked NOT_CONDITION, don't. */
export function meetsCondition(recipient: MailingRecipientValues, condition: string): boolean {
  return condition.startsWith(NOT_CONDITION)
    ? !recipient.meets.includes(condition.slice(NOT_CONDITION.length))
    : recipient.meets.includes(condition);
}

/**
 * A new letter: `greeting`, then the first of `fields` that's offered, then a
 * comma, as "Dear <salutation>,"; then a line to write on.
 */
export function greetingLetter(greeting: string, field: string | undefined): MailingDoc {
  const opening: MailingInline[] = field
    ? [
        { type: "text", text: `${greeting} ` },
        { type: "field", attrs: { field } },
        { type: "text", text: "," },
      ]
    : [{ type: "text", text: `${greeting},` }];
  return { type: "doc", content: [{ type: "paragraph", content: opening }, { type: "paragraph" }] };
}

/** What a recipient's letter is filled in with: their value for each field, and the conditions they meet. */
export type MailingRecipientValues = { values: Record<string, string>; meets: string[] };

const nonEmptyString = (value: unknown): value is string => typeof value === "string" && value !== "";

function checkMailingInline(node: unknown): MailingInline | undefined {
  if (!isObject(node) || node.type !== "field") return checkInline(node);
  if (!isObject(node.attrs) || !nonEmptyString(node.attrs.field)) return undefined;
  const marks = Array.isArray(node.marks) ? node.marks : [];
  const kept = marks
    .filter((mark): mark is Mark => isObject(mark) && (mark.type === "bold" || mark.type === "italic"))
    .map((mark) => ({ type: mark.type }));
  if (kept.length !== marks.length) return undefined;
  const field = { type: "field" as const, attrs: { field: node.attrs.field } };
  return kept.length > 0 ? { ...field, marks: kept } : field;
}

function checkMailingBlock(node: unknown, depth: number): MailingBlock | undefined {
  if (!isObject(node)) return undefined;
  const content = node.content === undefined ? [] : node.content;
  if (!Array.isArray(content)) return undefined;
  if (node.type === "paragraph") {
    const inline = content.map(checkMailingInline);
    return inline.every(Boolean) ? (paragraph(inline as Inline[]) as MailingParagraph) : undefined;
  }
  if (node.type === "bulletList" && depth < 5) {
    const items = content.map((item): MailingListItem | undefined => {
      if (!isObject(item) || item.type !== "listItem" || !Array.isArray(item.content)) return undefined;
      const blocks = item.content.map((block) => checkMailingBlock(block, depth + 1));
      return blocks.every(Boolean) ? { type: "listItem", content: blocks as MailingBlock[] } : undefined;
    });
    return items.every(Boolean) && items.length > 0
      ? { type: "bulletList", content: items as MailingListItem[] }
      : undefined;
  }
  return undefined;
}

function checkTopBlock(node: unknown): MailingBlock | OnlyForNode | undefined {
  if (!isObject(node) || node.type !== "onlyFor") return checkMailingBlock(node, 0);
  if (!isObject(node.attrs) || !nonEmptyString(node.attrs.condition)) return undefined;
  if (!Array.isArray(node.content) || node.content.length === 0) return undefined;
  const blocks = node.content.map((block) => checkMailingBlock(block, 0));
  return blocks.every(Boolean)
    ? { type: "onlyFor", attrs: { condition: node.attrs.condition }, content: blocks as MailingBlock[] }
    : undefined;
}

/** The editor's document, if it holds only what a mailing's letter may: otherwise undefined. */
export function checkMailingDoc(value: unknown): MailingDoc | undefined {
  if (!isObject(value) || value.type !== "doc" || !Array.isArray(value.content)) return undefined;
  const blocks = value.content.map(checkTopBlock);
  return blocks.every(Boolean) ? { type: "doc", content: blocks as MailingDoc["content"] } : undefined;
}

function inlinesOf(block: MailingBlock | OnlyForNode): MailingInline[] {
  if (block.type === "paragraph") return block.content ?? [];
  if (block.type === "onlyFor") return block.content.flatMap(inlinesOf);
  return block.content.flatMap((item) => item.content.flatMap(inlinesOf));
}

/** The merge fields the letter uses, each once, in the order they first come. */
export function fieldsIn(doc: MailingDoc): string[] {
  const fields = doc.content.flatMap(inlinesOf).flatMap((node) => (node.type === "field" ? [node.attrs.field] : []));
  return [...new Set(fields)];
}

/** The conditions of the letter's parts, each once, in order. */
export function conditionsIn(doc: MailingDoc): string[] {
  const conditions = doc.content.flatMap((block) => (block.type === "onlyFor" ? [block.attrs.condition] : []));
  return [...new Set(conditions)];
}

function fillInline(node: MailingInline, values: Record<string, string>): Inline {
  if (node.type !== "field") return node;
  const text = values[node.attrs.field] ?? "";
  return node.marks ? { type: "text", text, marks: node.marks } : { type: "text", text };
}

function fillBlock(block: MailingBlock, values: Record<string, string>): Block {
  if (block.type === "paragraph") {
    // A field with no value leaves no empty text node, which a letter can't have.
    const content = (block.content ?? []).map((node) => fillInline(node, values));
    return paragraph(content.filter((node) => node.type !== "text" || node.text !== ""));
  }
  return {
    type: "bulletList",
    content: block.content.map((item) => ({
      type: "listItem",
      content: item.content.map((inner) => fillBlock(inner, values)),
    })),
  };
}

/** One recipient's letter: their values in its fields, and only the parts for those who meet what they do. */
export function letterFor(doc: MailingDoc, recipient: MailingRecipientValues): LetterDoc {
  const content = doc.content.flatMap((block) => {
    if (block.type !== "onlyFor") return [fillBlock(block, recipient.values)];
    if (!meetsCondition(recipient, block.attrs.condition)) return [];
    return block.content.map((inner) => fillBlock(inner, recipient.values));
  });
  return { type: "doc", content };
}

/** Whether the letter has no words or fields in it. */
export function isBlankMailing(doc: MailingDoc): boolean {
  return doc.content
    .flatMap(inlinesOf)
    .every((node) => node.type === "hardBreak" || (node.type === "text" && !node.text.trim()));
}
