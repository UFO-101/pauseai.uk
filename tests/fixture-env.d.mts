export const LOCAL_URL: string;
export const MAIN_URL: string;
export const TEST_MP_EMAIL: string;
export const FIXTURE_NOW: string;
export const FLOW_DATABASE_COOKIE: string;
export const FLOW_DATABASE_PREFIX: string;
export function fixtureEnv(options: { outboxDir: string }): Record<string, string>;
