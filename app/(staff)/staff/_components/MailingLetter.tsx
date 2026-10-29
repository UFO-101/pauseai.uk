import type { ReactNode } from "react";
import { linkOf, type Mark } from "@/lib/letter-format";
import type { MailingBlock, MailingDoc, MailingInline, OnlyForNode } from "@/lib/mailing-doc";
import { NOT_CONDITION } from "@/lib/mailing-doc";
import { partFor } from "@/lib/mailing-fields";
import styles from "./MailingLetter.module.css";

/** A choice's label, or its ID when there's none, as for a field no longer offered. */
const labelOf = (labels: Record<string, string>, id: string) => labels[id] ?? id;

function marked(marks: Mark[] | undefined, content: ReactNode): ReactNode {
  let node = content;
  if (marks?.some((mark) => mark.type === "italic")) node = <em>{node}</em>;
  if (marks?.some((mark) => mark.type === "bold")) node = <strong>{node}</strong>;
  const href = linkOf(marks);
  return href ? (
    <a href={href} target="_blank" rel="noreferrer">
      {node}
    </a>
  ) : (
    node
  );
}

function Inline({ node, fields }: { node: MailingInline; fields: Record<string, string> }) {
  if (node.type === "hardBreak") return <br />;
  if (node.type === "field") {
    return marked(node.marks, <span className={styles.field}>{labelOf(fields, node.attrs.field)}</span>);
  }
  return marked(node.marks, node.text);
}

function Block({ block, fields }: { block: MailingBlock; fields: Record<string, string> }) {
  if (block.type === "paragraph") {
    return (
      <p>
        {(block.content ?? []).map((node, i) => (
          <Inline key={i} node={node} fields={fields} />
        ))}
      </p>
    );
  }
  if (block.type === "blockquote") {
    return (
      <blockquote>
        {block.content.map((inner, i) => (
          <Block key={i} block={inner} fields={fields} />
        ))}
      </blockquote>
    );
  }
  return (
    <ul>
      {block.content.map((item, i) => (
        <li key={i}>
          {item.content.map((inner, j) => (
            <Block key={j} block={inner} fields={fields} />
          ))}
        </li>
      ))}
    </ul>
  );
}

/**
 * A mailing's letter as it reads, never edited: its merge fields as chips
 * by their labels, and each part only some get in a box saying who. A
 * recipient's own letter (letterFor) has neither, so it reads as they'll get it.
 */
export function MailingLetter({
  doc,
  fields = {},
  conditions = {},
}: {
  doc: MailingDoc;
  fields?: Record<string, string>;
  conditions?: Record<string, string>;
}) {
  return (
    <div className={styles.letter}>
      {doc.content.map((block, i) =>
        block.type === "onlyFor" ? (
          <OnlyFor key={i} block={block} fields={fields} conditions={conditions} />
        ) : (
          <Block key={i} block={block} fields={fields} />
        ),
      )}
    </div>
  );
}

function OnlyFor({
  block,
  fields,
  conditions,
}: {
  block: OnlyForNode;
  fields: Record<string, string>;
  conditions: Record<string, string>;
}) {
  return (
    <div className={styles.onlyFor} data-except={block.attrs.condition.startsWith(NOT_CONDITION) || undefined}>
      <p className={styles.onlyForLabel}>{partFor(block.attrs.condition, conditions)}</p>
      {block.content.map((inner, i) => (
        <Block key={i} block={inner} fields={fields} />
      ))}
    </div>
  );
}
