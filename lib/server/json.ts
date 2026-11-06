import "server-only";

// Reading a body that may not be JSON: an error response from an API, a
// webhook's or a form's request. The one place that swallows the parse
// error, as "not JSON" is an answer (tests/checks/caught-errors.test.ts).

/** `text` parsed as JSON, or undefined if it isn't any. */
export function parseJsonIfAny(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/** A request's or response's body parsed as JSON, or undefined if it isn't any. */
export async function readJsonIfAny(body: Request | Response): Promise<unknown> {
  return parseJsonIfAny(await body.text());
}
