// What a message says, apart from what's only in the way: the earlier mail it
// quotes and the footer its mailer or office adds. The thread on a letter's
// page shows every message in turn, so these are folded away, not lost. A
// top-posted reply folds everything from its quote's header down: Outlook's
// "From: … Sent: …" block (in Welsh too, for the Senedd), its line of
// underscores, "-----Original Message-----", a forward's header, an "On …
// wrote:" with no quote marks under it, or the "> " lines at its foot and the
// "On … wrote:" over them. One answered in between the quoted lines keeps
// those, as the reply needs them, and folds only the quote at its foot.

/** A message's parts: what it says, its lines rewrapped, and the quote and footer below that, empty if none. */
export type ReplyParts = { text: string; quoted: string };

/** A line quoted with "> ". */
const QUOTED = /^\s*>/;

/** Lines that start a quote of their own: an old mailer's header or a forward's. */
const QUOTE_LINE = /^\s*(-{2,}\s*(Original Message|Forwarded message)\s*-{2,}|_{10,}|Begin forwarded message:)\s*$/i;

/** The start of a quote's From block in English or Welsh, either maybe in bold, and what comes under it. */
const FROM_LINE = /^\s*\*?(From|Oddi wrth):/i;
const SENT_LINE = /^\s*\*?(Sent|Date|Anfonwyd|Dyddiad):/i;

/** The first and last lines of "On … wrote:", in English or Welsh, which a mailer may wrap; a time or year in it says it's a quote's. */
const WROTE_STARTS = /^\s*(On|Ar)\s/i;
const WROTE_ENDS = /\b(wrote|ysgrifennodd):\s*$/i;
const WROTE_DATE = /\d{1,2}[:.]\d{2}|\b\d{4}\b/;

/** A line starting what a mailer or an office adds under every message. */
const FOOTER_LINE =
  /^\s*(UK Parliament Disclaimer|Sent from (my|Outlook|Mail)\b|Get Outlook for\b|Anfonwyd o['’]\w*|DISCLAIMER\b|CONFIDENTIALITY( NOTICE)?\b|This (e-?mail|message)\b.{0,60}\b(confidential|intended|privileged)\b)/i;

/** Whether "On … wrote:" starts at a line, over text with no quote marks: "> " lines have their own way out, as a reply may answer between them. */
function startsUnmarkedWrote(lines: string[], i: number): boolean {
  if (!WROTE_STARTS.test(lines[i]!)) return false;
  const span = [0, 1, 2].find((n) => WROTE_ENDS.test(lines[i + n] ?? ""));
  if (span === undefined || !WROTE_DATE.test(lines.slice(i, i + span + 1).join(" "))) return false;
  const under = lines.slice(i + span + 1).find((line) => line.trim());
  return under !== undefined && !QUOTED.test(under);
}

/** Where what's folded starts, unmarked: a quote's header or a footer. */
function startsFolded(lines: string[], i: number): boolean {
  const line = lines[i]!;
  if (QUOTE_LINE.test(line) || FOOTER_LINE.test(line) || startsUnmarkedWrote(lines, i)) return true;
  return FROM_LINE.test(line) && lines.slice(i + 1, i + 4).some((next) => SENT_LINE.test(next));
}

/** How many of the lines at the end are the "On … wrote:" over a quote, which a mailer may wrap: 0 if they aren't. */
function wroteLines(lines: string[]): number {
  if (!WROTE_ENDS.test(lines.at(-1) ?? "")) return 0;
  const count = [1, 2, 3].find((n) => n <= lines.length && WROTE_STARTS.test(lines.at(-n)!));
  return count ?? 1;
}

/** Drops the blank lines at the end. */
function trimEnd(lines: string[]): string[] {
  let end = lines.length;
  while (end > 0 && !lines[end - 1]!.trim()) end--;
  return lines.slice(0, end);
}

/** The width past which a block's lines can't be a mailer's wrapping, and under which they needn't be. */
const WRAP_WIDTHS = { narrowest: 60, widest: 100 };

/** Whether a line starts a list's item or is quoted, which keep their own line. */
const KEEPS_ITS_LINE = /^\s*([-*•>]|\d+[.)])\s/;

/** A block of lines, its mailer's wrapping undone: a line that ends a sentence, or left room for the next's first word, was ended by its writer. */
function unwrappedBlock(block: string): string {
  const lines = block.split("\n");
  const width = Math.max(...lines.map((line) => line.length));
  if (width < WRAP_WIDTHS.narrowest || width > WRAP_WIDTHS.widest) return block;
  return lines.reduce((joined, next, i) => {
    if (i === 0) return next;
    const line = lines[i - 1]!;
    const wrapped =
      line.length + 1 + next.trimStart().split(" ")[0]!.length > width &&
      !/[.!?:]$/.test(line) &&
      !KEEPS_ITS_LINE.test(line) &&
      !KEEPS_ITS_LINE.test(next);
    return `${joined}${wrapped ? " " : "\n"}${next}`;
  }, "");
}

/** A text with its mailer's wrapping undone, block by block. */
function unwrapped(text: string): string {
  return text
    .split(/(\n[ \t]*\n)/)
    .map(unwrappedBlock)
    .join("");
}

/** A letter's kept text, to read: without a mailer's "> " or its wrapping. */
export function letterText(text: string): string {
  return unwrapped(text.replace(/^[ \t]*> ?/gm, ""));
}

/** A message's parts; all of it what it says if that would leave nothing. */
export function replyParts(text: string): ReplyParts {
  const all = text.split("\n");
  const unmarked = all.findIndex((_, i) => !QUOTED.test(all[i]!) && startsFolded(all, i));
  let lines = trimEnd(unmarked === -1 ? all : all.slice(0, unmarked));
  let quoted = false;
  while (lines.length && QUOTED.test(lines.at(-1)!)) {
    lines = trimEnd(lines.slice(0, -1));
    quoted = true;
  }
  if (quoted) lines = trimEnd(lines.slice(0, lines.length - wroteLines(lines)));
  if (!lines.length) return { text: unwrapped(text), quoted: "" };
  return { text: unwrapped(lines.join("\n")), quoted: all.slice(lines.length).join("\n").trim() };
}
