// Stands in for next/headers in Node tests, which run outside a request:
// vi.mock("next/headers", () => import("@/tests/next-headers")). Tests put
// the request's cookies in requestCookies.
export const requestCookies = new Map<string, string>();

export async function cookies() {
  return {
    get: (name: string) => (requestCookies.has(name) ? { name, value: requestCookies.get(name)! } : undefined),
  };
}

/** The path a Next redirect() threw towards, or undefined if it wasn't one. */
export function redirectedTo(error: unknown): string | undefined {
  const digest = (error as { digest?: string })?.digest;
  return digest?.startsWith("NEXT_REDIRECT") ? digest.split(";")[2] : undefined;
}

/** Runs `work` and returns where it redirected to. Fails if it didn't. */
export async function expectRedirect(work: () => Promise<unknown>): Promise<string> {
  try {
    await work();
  } catch (error) {
    const to = redirectedTo(error);
    if (to) return to;
    throw error;
  }
  throw new Error("expected a redirect");
}
