// What a supporter changed in the letter a campaign gave them: the draft
// the form began with against the letter they sent, word by word. Used by
// the form, the server that keeps both, and the letter's page.

/**
 * A short hash of a draft's text, so the server can tell whether the draft
 * it rebuilds is the one the form was given: FNV-1a, which needs no
 * crypto and gives the same in the browser and on the server.
 */
export function draftHash(text: string): string {
  let hash = 0x811c9dc5;
  for (const char of text) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** A run of words the two texts share, or that only the sent letter has (added), or only the draft (removed). */
export type Change = { kind: "same" | "added" | "removed"; text: string };

/** A text as words, each with the space after it, so joined they give the text back. */
function words(text: string): string[] {
  return text.match(/\S+\s*|\s+/g) ?? [];
}

/**
 * The changes from `draft` to `sent`, word by word, by their longest common
 * run of words (a letter is a few hundred words, so the table is small);
 * neighbouring words of a kind joined into one run. Spacing alone isn't a
 * change.
 */
export function wordDiff(draft: string, sent: string): Change[] {
  const a = words(draft);
  const b = words(sent);
  const key = (word: string) => word.trim();
  // lengths[i][j]: the longest common run of a[i..] and b[j..].
  const lengths = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lengths[i][j] =
        key(a[i]) === key(b[j]) ? lengths[i + 1][j + 1] + 1 : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }
  const changes: Change[] = [];
  const push = (kind: Change["kind"], text: string) => {
    const last = changes.at(-1);
    if (last?.kind === kind) last.text += text;
    else changes.push({ kind, text });
  };
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && key(a[i]) === key(b[j])) {
      push("same", b[j]);
      i++;
      j++;
    } else if (j < b.length && (i === a.length || lengths[i][j + 1] >= lengths[i + 1][j])) {
      push("added", b[j++]);
    } else {
      push("removed", a[i++]);
    }
  }
  return changes;
}

/** How many words a text has. */
function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** The share of the sent letter's words that aren't the draft's, from 0 to 1. */
export function ownWords(draft: string, sent: string): number {
  const total = wordCount(sent);
  if (total === 0) return 0;
  const added = wordDiff(draft, sent)
    .filter((change) => change.kind === "added")
    .reduce((n, change) => n + wordCount(change.text), 0);
  return added / total;
}

/**
 * A letter's changes as the page shows them: each run of paragraphs the
 * supporter changed, added or cut, with its changes word by word; and each
 * run of paragraphs they left as they were, to fold away.
 */
export type ChangeBlock = { kind: "changed"; changes: Change[] } | { kind: "unchanged"; paragraphs: string[] };

/**
 * What was cut and added in place of it, word by word; or, where they
 * share less than half the words of the shorter, so a word diff would mix
 * two different texts, the one struck through whole, then the other.
 */
function rewritten(cut: string, added: string): Change[] {
  const changes = wordDiff(cut, added);
  const shared = changes.filter((c) => c.kind === "same").reduce((n, c) => n + wordCount(c.text), 0);
  if (shared * 2 >= Math.min(wordCount(cut), wordCount(added))) return changes;
  return [
    { kind: "removed" as const, text: cut },
    { kind: "added" as const, text: added },
  ].filter((change) => change.text);
}

/** A text's paragraphs, trimmed, without empty ones. */
function paragraphsOf(text: string): string[] {
  return text
    .split(/\n[ \t]*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * The changes from `draft` to `sent` by paragraph: those the two share,
 * by their longest common run, and between them, what was cut and added,
 * compared word by word (wordDiff).
 */
export function changeBlocks(draft: string, sent: string): ChangeBlock[] {
  const a = paragraphsOf(draft);
  const b = paragraphsOf(sent);
  const lengths = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lengths[i][j] = a[i] === b[j] ? lengths[i + 1][j + 1] + 1 : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }
  const blocks: ChangeBlock[] = [];
  let cut: string[] = [];
  let added: string[] = [];
  const flush = () => {
    if (cut.length || added.length)
      blocks.push({ kind: "changed", changes: rewritten(cut.join("\n\n"), added.join("\n\n")) });
    cut = [];
    added = [];
  };
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      flush();
      const last = blocks.at(-1);
      if (last?.kind === "unchanged") last.paragraphs.push(a[i]);
      else blocks.push({ kind: "unchanged", paragraphs: [a[i]] });
      i++;
      j++;
    } else if (j < b.length && (i === a.length || lengths[i][j + 1] >= lengths[i + 1][j])) {
      added.push(b[j++]);
    } else {
      cut.push(a[i++]);
    }
  }
  flush();
  return blocks;
}
