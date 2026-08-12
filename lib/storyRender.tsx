import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

export function parseCssStyle(css: string): CSSProperties {
  const result: Record<string, string> = {};
  css.split(";").filter(Boolean).forEach((decl) => {
    const colonIdx = decl.indexOf(":");
    if (colonIdx === -1) return;
    const key = decl.slice(0, colonIdx).trim().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    result[key] = decl.slice(colonIdx + 1).trim();
  });
  return result as CSSProperties;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Content for the avatar circle when there's no photo: initials, or the
// PauseAI pause symbol for anonymous submissions (no initials to show).
export function avatarFallback(name: string): ReactNode {
  if (!name.trim()) {
    return <Image src="/images/logos/Pause-Symbol.svg" alt="" width={616} height={616} className="person-avatar-pause-icon" />;
  }
  return initials(name);
}

const BULLET_PREFIX = /^-\s+/;

export function isBulletLine(text: string): boolean {
  return BULLET_PREFIX.test(text.trim());
}

export function bulletText(text: string): string {
  return text.trim().replace(BULLET_PREFIX, "");
}

export function renderBody(paragraphs: string[], asHtml: boolean): ReactNode[] {
  const blocks: ReactNode[] = [];
  let i = 0;
  while (i < paragraphs.length) {
    if (isBulletLine(paragraphs[i])) {
      const items: string[] = [];
      const start = i;
      while (i < paragraphs.length && isBulletLine(paragraphs[i])) {
        items.push(bulletText(paragraphs[i]));
        i++;
      }
      blocks.push(
        <ul key={`ul-${start}`}>
          {items.map((item, j) =>
            asHtml ? <li key={j} dangerouslySetInnerHTML={{ __html: item }} /> : <li key={j}>{item}</li>
          )}
        </ul>
      );
    } else {
      const para = paragraphs[i];
      blocks.push(asHtml ? <p key={i} dangerouslySetInnerHTML={{ __html: para }} /> : <p key={i}>{para}</p>);
      i++;
    }
  }
  return blocks;
}
