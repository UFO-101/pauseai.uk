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
export function avatarFallback(name: string | undefined): ReactNode {
  if (!name?.trim()) {
    return <Image src="/images/logos/Pause-Symbol.svg" alt="" width={616} height={616} className="person-avatar-pause-icon" />;
  }
  return initials(name);
}

// Story text originates in public submissions (the Tally form) and is pasted
// into lib/data/people.ts by hand, so the paragraphs rendered as real HTML go
// through this allowlist first — a careless paste shouldn't be able to become
// persistent XSS. Allowed tags are rendered stripped of every attribute;
// anything else has its tags dropped and its text kept and escaped.
const ALLOWED_TAGS = new Set(["em", "strong", "i", "b", "br"]);
const TAG = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
const HREF = /href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
// Deliberately excludes javascript:, data: and protocol-relative URLs.
const SAFE_HREF = /^(?:https?:\/\/|mailto:)/i;

function escapeText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;");
}

export function sanitizeHtml(input: string): string {
  let out = "";
  let last = 0;

  for (const match of input.matchAll(TAG)) {
    const index = match.index!;
    out += escapeText(input.slice(last, index));
    last = index + match[0].length;

    const name = match[1].toLowerCase();
    const isClosing = match[0].startsWith("</");

    if (ALLOWED_TAGS.has(name)) {
      out += isClosing ? `</${name}>` : `<${name}>`;
    } else if (name === "a") {
      if (isClosing) {
        out += "</a>";
        continue;
      }
      const href = HREF.exec(match[2]);
      const url = (href?.[1] ?? href?.[2] ?? href?.[3] ?? "").trim();
      // An unsafe or missing href still emits <a> so the matching </a> below
      // doesn't leak into the output as stray text — it just isn't a link.
      out += SAFE_HREF.test(url)
        ? `<a href="${escapeAttr(url)}" target="_blank" rel="noreferrer">`
        : "<a>";
    }
    // Everything else: tag dropped, inner text kept (and escaped) by the
    // slices either side of it.
  }

  return out + escapeText(input.slice(last));
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
            asHtml ? <li key={j} dangerouslySetInnerHTML={{ __html: sanitizeHtml(item) }} /> : <li key={j}>{item}</li>
          )}
        </ul>
      );
    } else {
      const para = paragraphs[i];
      blocks.push(
        asHtml ? <p key={i} dangerouslySetInnerHTML={{ __html: sanitizeHtml(para) }} /> : <p key={i}>{para}</p>
      );
      i++;
    }
  }
  return blocks;
}
