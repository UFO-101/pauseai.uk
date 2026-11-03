type FileCoverage = { s: Record<string, number>; f: Record<string, number>; b: Record<string, number[]> };
export function dropUnrunCopies<T extends FileCoverage>(coverages: Record<string, T>[]): Record<string, T>[];
export function prepareBlobs(dir: string): void;
