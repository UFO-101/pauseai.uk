// PauseAI messaging guideline rules. Single source of truth used by both the
// Sanity schema validators (Studio shows them inline) and, if you wire one up,
// a pre-commit lint of staged copy.

export type RuleLevel = "error" | "warning";

export interface MessagingRule {
  level: RuleLevel;
  pattern: RegExp;
  message: string;
}

export const RULES: MessagingRule[] = [
  {
    level: "error",
    pattern: /Pause AI/,
    message: "Brand is one word: write 'PauseAI', not 'Pause AI'.",
  },
  {
    level: "warning",
    pattern: /\bactivists?\b|grassroots/i,
    message:
      "Prefer 'citizens / advocates / our community / civic movement'.",
  },
  {
    level: "warning",
    pattern: /tech bro|big ai|\bcorporations?\b/i,
    message:
      "Prefer 'a handful of labs racing in a way nobody consented to'.",
  },
  {
    level: "warning",
    pattern: /existential risk/i,
    message: "Prefer 'extinction risk' (less abstract).",
  },
  {
    level: "warning",
    pattern: /\btreaty\b/i,
    message: "Prefer 'international agreement'.",
  },
  {
    level: "warning",
    pattern: /kill us all|ban all ai/i,
    message:
      "Prefer 'trajectory towards loss of control' + sourced claims.",
  },
  {
    level: "warning",
    pattern: /\bAGI\b/,
    message: "Prefer 'smarter-than-human AI' or 'frontier AI'.",
  },
];

export function firstHit(text: string, level: RuleLevel): string | null {
  for (const rule of RULES) {
    if (rule.level === level && rule.pattern.test(text)) return rule.message;
  }
  return null;
}
