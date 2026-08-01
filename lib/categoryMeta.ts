// Short, plain-language descriptions of each incident category, keyed by slug.
const categoryDescriptions: Record<string, string> = {
  "broken-commitment":
    "A company walks back a public safety or governance promise.",
  "deceptive-advocacy":
    "Misleading lobbying or public messaging on AI policy.",
  safetywashing:
    "Overstating safety work to seem more responsible than it is.",
  whistleblower:
    "Restrictive NDAs or retaliation against staff who speak up.",
  "mission-conflict":
    "Actions that cut against the company's own stated mission.",
  "consumer-harm":
    "Products that put users — including children — at risk.",
  "benchmark-gaming":
    "Gaming evaluations or benchmarks to inflate results.",
  "data-practices":
    "Questionable handling of user data or training data.",
};

export function categoryDescription(slug: string): string {
  return categoryDescriptions[slug] ?? "";
}
