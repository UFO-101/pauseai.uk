// A plain-text email's marks, as Gmail's plain text writes them: a link as
// its address, often twice ("https://a.org <https://a.org>"), and bold words
// between asterisks. ThreadText shows them.

/** A piece of an email's text: words, a link, or bold pieces. */
export type MailPart = { text: string } | { link: string } | { bold: MailPart[] };

/** An address, up to a space or an angle bracket. */
const URL = /https?:\/\/[^\s<>"]+/g;

/** What can follow an address without being part of it. */
const AFTER_URL = /[.,;:!?)\]'*]+$/;

/**
 * Asterisks around words, starting and ending at a word's edge, so "2 * 3" and
 * a "* " list aren't bold; within a paragraph, so a stray one pairs with nothing
 * further down.
 */
const BOLD = /(^|[\s(])\*(?=\S)((?:(?!\n\s*\n)[^*])*?[^\s*])\*(?=$|[\s).,;:!?])/gm;

/** The links in `text`, an address given twice being one link. */
function linked(text: string): MailPart[] {
  const parts: MailPart[] = [];
  const add = (words: string) => {
    if (words) parts.push({ text: words });
  };
  let from = 0;
  for (const match of text.matchAll(URL)) {
    if (match.index < from) continue;
    const link = match[0].replace(AFTER_URL, "");
    add(text.slice(from, match.index));
    parts.push({ link });
    from = match.index + link.length;
    const again = `<${link}>`;
    const gap = text.slice(from).match(/^\s*/)![0];
    if (text.startsWith(again, from + gap.length)) from += gap.length + again.length;
  }
  add(text.slice(from));
  return parts;
}

/** An email's text, in pieces. */
export function mailParts(text: string): MailPart[] {
  const parts: MailPart[] = [];
  let from = 0;
  for (const match of text.matchAll(BOLD)) {
    const start = match.index + match[1].length;
    parts.push(...linked(text.slice(from, start)), { bold: linked(match[2]) });
    from = match.index + match[0].length;
  }
  parts.push(...linked(text.slice(from)));
  return parts;
}
