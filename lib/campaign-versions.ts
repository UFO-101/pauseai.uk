import { docFromMarkup, type Inline } from "./letter-format";
import type { MailingDoc, MailingInline } from "./mailing-doc";

// A campaign's text as its page shows it: its names as a mailing's merge
// fields are, as chips.

const NAME = /\{(salutation|constituency|name|postcode)\}/g;

/** A text run with each {name} in it a merge field. */
function fieldsIn(node: Inline): MailingInline[] {
  if (node.type !== "text") return [node];
  const nodes: MailingInline[] = [];
  let at = 0;
  for (const match of node.text.matchAll(NAME)) {
    if (match.index > at) nodes.push({ ...node, text: node.text.slice(at, match.index) });
    nodes.push({ type: "field", attrs: { field: match[1] } });
    at = match.index + match[0].length;
  }
  if (at < node.text.length) nodes.push({ ...node, text: node.text.slice(at) });
  return nodes;
}

/** A campaign's text, written with the letter markup, as a document whose names are merge fields. */
export function campaignTextDoc(text: string): MailingDoc {
  const doc = docFromMarkup(text);
  return {
    type: "doc",
    content: doc.content.map((block) =>
      block.type === "paragraph" ? { type: "paragraph", content: block.content!.flatMap(fieldsIn) } : block,
    ) as MailingDoc["content"],
  };
}
