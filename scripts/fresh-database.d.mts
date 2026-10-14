export function databaseUrl(name: string): string;
export function migrationFiles(): string[];
export function dropDatabase(name: string): void;
export function freshDatabase(name: string, options?: { singleTransaction?: boolean }): string;
export function addTestMps(url: string, email: string): void;
export function defaultHost(port?: string, places?: string[]): string;
export function resetDatabase(url: string, options?: { singleTransaction?: boolean }): string;
export function isLocal(url: string): boolean;
export function testServerUrl(env?: Record<string, string | undefined>, envFile?: string): string | undefined;
