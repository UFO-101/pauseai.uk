export const LOCAL_URL: string;
export const MAIN_URL: string;
export const TEST_MP_EMAIL: string;
export const LETTERS_INBOX: string;
export const NOTIFICATION_INBOX: string;
export const FIXTURE_NOW: string;
export const FLOW_DATABASE_COOKIE: string;
export const FLOW_DATABASE_PREFIX: string;
export function fixtureEnv(options: { outboxDir: string; origin?: string }): Record<string, string>;
