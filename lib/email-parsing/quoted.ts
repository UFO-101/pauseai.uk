// What a message's text says of the mail it quotes, and text a mailer damaged.

/** The headers of a quoted message: who it was from and to, and when it was sent, as written there. */
export type QuotedHeaders = { from: string; sent: string; to: string; cc: string; subject: string };

/** Each message a text quotes or forwards, by its From, Sent, To and Cc block. */
export function quotedHeaders(text: string): QuotedHeaders[] {
  const clean = text.replace(/\r/g, "").replace(/^[> ]+/gm, "");
  const lines = clean.split("\n");
  const found: QuotedHeaders[] = [];
  const field = (line: string, name: string) =>
    new RegExp(`^\\*?${name}:\\*?\\s*(.*)$`, "i").exec(line.trim())?.[1]?.trim();
  for (let i = 0; i < lines.length; i++) {
    const from = field(lines[i], "from");
    if (from === undefined) continue;
    const block: QuotedHeaders = { from, sent: "", to: "", cc: "", subject: "" };
    /** Takes a line's field into the block; false at a line that's no field, which ends the headers. */
    const takeField = (line: string): boolean => {
      if (!line.trim()) return true;
      const sent = field(line, "sent") ?? field(line, "date");
      const to = field(line, "to");
      const cc = field(line, "cc");
      const subject = field(line, "subject");
      if (sent !== undefined) block.sent = sent;
      else if (to !== undefined) block.to = to;
      else if (cc !== undefined) block.cc = cc;
      else if (subject !== undefined) block.subject = subject;
      else return false;
      return true;
    };
    lines.slice(i + 1, i + 12).every(takeField);
    // Thunderbird's forward has its Subject and Date over its From.
    if (!block.sent)
      lines
        .slice(Math.max(0, i - 11), i)
        .reverse()
        .every(takeField);
    if (block.sent) found.push(block);
  }
  for (const match of clean.matchAll(
    /^On (.{5,120}?),? (?:at )?.{0,60}?<?([\w.+'&-]+@[\w.-]+\.\w+)>?\s*wrote:\s*$/gim,
  )) {
    found.push({ from: match[2], sent: match[1], to: "", cc: "", subject: "" });
  }
  return found;
}

/**
 * Curly quotes and dashes as Joseph's sends have them: whatever sent those mail
 * kept only each character's low byte, which leaves a control character.
 */
const CUT_DOWN_CHARACTERS = "\x13\x14\x18\x19\x1c\x1d";

/** The characters those were, in the same order. */
const WHOLE_CHARACTERS = "\u2013\u2014\u2018\u2019\u201c\u201d";

/** A text with its cut-down characters whole again. */
export function restoreCutDown(text: string): string {
  return text.replace(/[\x13\x14\x18\x19\x1c\x1d]/g, (c) => WHOLE_CHARACTERS[CUT_DOWN_CHARACTERS.indexOf(c)]);
}
