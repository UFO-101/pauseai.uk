import type { ReactNode } from "react";
import styles from "./BriefingSheet.module.css";

/**
 * The paper a briefing is printed on: a white sheet on the page, edge to edge
 * on a phone. It sets the briefing's type, and the look of the plain elements
 * a briefing's text is written in: paragraphs, lists, headings over a story
 * and the marks citing a source.
 */
export default function BriefingSheet({
  as: Tag = "article",
  children,
}: {
  as?: "article" | "div";
  children: ReactNode;
}) {
  return <Tag className={styles.sheet}>{children}</Tag>;
}
