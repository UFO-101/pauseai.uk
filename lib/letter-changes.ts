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
