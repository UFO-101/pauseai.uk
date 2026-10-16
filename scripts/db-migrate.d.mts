export function migrationName(file: string): string;
export function pendingMigrations(files: string[], applied: string[], appliedUpTo?: string): string[];
export function recordApplied(url: string, files: string[]): void;
export function migrate(url: string, options?: { appliedUpTo?: string }): string[];
