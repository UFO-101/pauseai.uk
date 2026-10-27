// Each party's colour, for the rosette beside a politician's party: the
// colours the parties use, as Wikipedia's lists of UK parties give them.
// A party is matched by the longest name it contains, so "Labour (Co-op)"
// and "Welsh Labour" are Labour's; one we don't know is grey.
const PARTY_COLOURS: Record<string, string> = {
  labour: "#e4003b",
  conservative: "#0087dc",
  "liberal democrat": "#faa61a",
  "scottish national party": "#fdf38e",
  snp: "#fdf38e",
  green: "#02a95b",
  "plaid cymru": "#005b54",
  reform: "#12b6cf",
  "democratic unionist": "#d46a4c",
  dup: "#d46a4c",
  "sinn féin": "#326760",
  alliance: "#f6cb2f",
  sdlp: "#2aa82c",
  "social democratic and labour": "#2aa82c",
  "ulster unionist": "#48a5ee",
  uup: "#48a5ee",
  alba: "#005eb8",
  "workers party": "#9c1c1c",
};

/** The colour the rosette beside `party` is: its party's, or grey. */
export function partyColour(party: string): string {
  const name = party.toLowerCase();
  const match = Object.keys(PARTY_COLOURS)
    .filter((key) => name.includes(key))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PARTY_COLOURS[match] : "#8a8178";
}
