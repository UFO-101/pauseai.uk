export const SCHEMA_FILE: string;
export const PG_DUMP_MAJOR: number;
export function pgDumpMajor(): number | undefined;
export function normaliseSchema(dump: string): string;
export function currentSchema(): string;
export const HEADER: string;
