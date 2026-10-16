// Waiting for slow work in the browser tests: a download or a share that
// first draws and encodes images, which takes under a second here and has
// taken well over 15s on a loaded CI runner. A poll gives up at a deadline;
// this waits for the call itself, for as long as the test may run.
import type { Mock } from "vitest";

/**
 * Resolves with the arguments of `mock`'s next call, which returns what
 * `result` does (by default, nothing). Set it up before the click that
 * leads to the call.
 */
export function nextCall(mock: Mock, result: () => unknown = () => undefined): Promise<unknown[]> {
  return new Promise((called) =>
    mock.mockImplementationOnce((...args: unknown[]) => {
      called(args);
      return result();
    }),
  );
}
