type FlowRun = {
  section: string;
  flow: string;
  viewport: string;
  line: number;
  status: "passed" | "failed" | "timedOut" | "interrupted";
  error?: string;
  frames: { caption: string; png?: string }[];
};
type Manifest = { frames: FlowRun[] };
type ListSuite = { specs?: { title: string; file: string; tests: { projectName: string }[] }[]; suites?: ListSuite[] };

export function flowKey(run: { viewport: string; section: string; flow: string }): string;
export function listedFlows(list: { suites?: ListSuite[] }): Set<string>;
export function cacheKey(commit: string, files: Iterable<[string, string]>): string;
export function missingFlows(cached: Manifest, wanted: Set<string>): string[];
export function mergeRun(cached: Manifest, fresh: Manifest, from: string, to: string): Manifest;
export function selectFlows(manifest: Manifest, wanted: Set<string>, prefix?: string): Manifest;
export function carryFlows(previous: Manifest, fresh: Manifest): Manifest;
export function runFolder(startedAt: string): string;
