export function databaseUrl(name: string): string;
export function migrationFiles(): string[];
export function dropDatabase(name: string): void;
export function freshDatabase(name: string, options?: { singleTransaction?: boolean }): string;
export function addTestMp(url: string, email: string): void;
