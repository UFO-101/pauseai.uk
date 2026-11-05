import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { type Run, registerRunStore } from "./problems";

// Where a run in progress is kept, so problem() finds it from anywhere in
// the job's work without being handed it: Node's AsyncLocalStorage, which
// follows the work across awaits. Its own module, as a server component
// that reports a problem may be bundled for the browser, where there's no
// async_hooks; this module is only ever loaded by the import log.

const runs = new AsyncLocalStorage<Run>();

/** Does `work` as a run, so what it reports with problem() is kept on it. */
export function inRun<T>(work: (run: Run) => Promise<T>): Promise<T> {
  const run: Run = { problems: [] };
  return runs.run(run, () => work(run));
}

/** The run in progress, if any. */
export function currentRun(): Run | undefined {
  return runs.getStore();
}

registerRunStore(currentRun);
