export const OUTBOX_DIR: string;
export const MAIN_OUTBOX_DIR: string;
export function fixtureEnv(options: { outboxDir: string }): Record<string, string>;
