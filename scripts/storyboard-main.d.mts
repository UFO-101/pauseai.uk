type FlowRun = {
  section: string;
  flow: string;
  viewport: string;
  line: number;
  status: "passed" | "failed" | "timedOut" | "interrupted";
  error?: string;
  frames: { caption: string; png?: string }[];
  /** In the cache: the hash of the flow's spec file when main ran it. */
  spec?: string;
};
type Manifest = { frames: FlowRun[] };
type ListSuite = {
  title?: string;
  specs?: { title: string; file: string; tests: { projectName: string }[] }[];
  suites?: ListSuite[];
};

export function flowKey(run: { viewport: string; section: string; flow: string }): string;
export function listedFlows(list: { suites?: ListSuite[] }): Map<string, string>;
export function cacheKey(commit: string, files: Iterable<[string, string]>): string;
export function missingFlows(cached: Manifest, wanted: Iterable<string>, specs: Record<string, string>): string[];
export function mergeRun(
  cached: Manifest,
  fresh: Manifest,
  from: string,
  to: string,
  specs: Record<string, string>,
): Manifest;
export function picturedFlows(branch: Manifest, wanted: Iterable<string>): Set<string>;
export function selectFlows(manifest: Manifest, wanted: { has(key: string): boolean }, prefix?: string): Manifest;
export function carryFlows(previous: Manifest, fresh: Manifest): Manifest;
export function carryable(manifest: Manifest, suite: { has(key: string): boolean }, foreign?: string): Manifest;
export function runFolder(startedAt: string): string;
