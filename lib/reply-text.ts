// What a reply says, without the earlier mail it quotes. The thread on a
// letter's page shows every message in turn, so a reply's copy of the one
// before is only in the way. A top-posted reply loses everything from its
// quote's header down: Outlook's "From: … Sent: …" block, its line of
// underscores, "-----Original Message-----", or the "> " lines at its foot
// and the "On … wrote:" over them. One answered in between the quoted lines
// keeps those, as the reply needs them, and loses only the quote at its foot.

/** A line quoted with "> ". */
const QUOTED = /^\s*>/;

/** Where Outlook and older mailers start the message they quote, unmarked. */
function startsUnmarkedQuote(lines: string[], i: number): boolean {
  const line = lines[i]!;
  if (/^\s*-{2,}\s*Original Message\s*-{2,}\s*$/i.test(line) || /^\s*_{10,}\s*$/.test(line)) return true;
  // "From:" with "Sent:" or "Date:" under it, either maybe in bold.
  return /^\s*\*?From:/i.test(line) && lines.slice(i + 1, i + 4).some((next) => /^\s*\*?(Sent|Date):/i.test(next));
}

/** How many of the lines at the end are the "On … wrote:" over a quote, which a mailer may wrap: 0 if they aren't. */
function wroteLines(lines: string[]): number {
  if (!/\bwrote:\s*$/i.test(lines.at(-1) ?? "")) return 0;
  const count = [1, 2, 3].find((n) => n <= lines.length && /^\s*On\s/i.test(lines.at(-n)!));
  return count ?? 1;
}

/** Drops the blank lines at the end. */
function trimEnd(lines: string[]): string[] {
  let end = lines.length;
  while (end > 0 && !lines[end - 1]!.trim()) end--;
  return lines.slice(0, end);
}

/** A reply's text without the earlier mail it quotes; the whole text if that's all it is. */
export function replyText(text: string): string {
  const all = text.split("\n");
  const unmarked = all.findIndex((_, i) => !QUOTED.test(all[i]!) && startsUnmarkedQuote(all, i));
  let lines = trimEnd(unmarked === -1 ? all : all.slice(0, unmarked));
  let quoted = false;
  while (lines.length && QUOTED.test(lines.at(-1)!)) {
    lines = trimEnd(lines.slice(0, -1));
    quoted = true;
  }
  if (quoted) lines = trimEnd(lines.slice(0, lines.length - wroteLines(lines)));
  return lines.length ? lines.join("\n") : text;
}
