/** A field's value before a change and after it. */
export type FieldChange = [before: unknown, after: unknown];

/**
 * The fields of `after` whose values differ from `before`'s, each as
 * [before, after], for the audit log to say what an edit changed. A field
 * `before` lacks was null.
 */
export function changedFields(before: object, after: object): Record<string, FieldChange> {
  const was = before as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(after)
      .filter(([key, value]) => (was[key] ?? null) !== (value ?? null))
      .map(([key, value]) => [key, [was[key] ?? null, value ?? null]]),
  );
}
