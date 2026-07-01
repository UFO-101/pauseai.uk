import { firstHit } from "@/lib/messagingRules";

// Drop-in for a defineField `validation` callback. Surfaces brand-spelling
// errors and discouraged-term warnings live in Studio as the editor types.
//
// Usage:
//   validation: messagingValidation
// or composed with other rules:
//   validation: (Rule) => [Rule.required(), ...messagingValidation(Rule)],
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const messagingValidation = (Rule: any) => [
  Rule.custom((value: unknown) => {
    const text = typeof value === "string" ? value : "";
    return firstHit(text, "error") ?? true;
  }),
  Rule.custom((value: unknown) => {
    const text = typeof value === "string" ? value : "";
    return firstHit(text, "warning") ?? true;
  }).warning(),
];
