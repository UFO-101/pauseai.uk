// The values the politicians list's filters choose among, shared by the
// server's query (lib/server/politicians.ts) and the filter bar.

/** The nations a politician can be in. */
export const COUNTRIES = ["england", "scotland", "wales", "northern-ireland"] as const;
export type Country = (typeof COUNTRIES)[number];

/** The politicians list's markers: the boxes ticked in Airtable, and a record it no longer has. */
export const POLITICIAN_FLAGS = ["important", "connection", "removed"] as const;
export type PoliticianFlag = (typeof POLITICIAN_FLAGS)[number];

/** Whether we can write to them: an address we can use, none, or one that's blocked. */
export const EMAIL_STATES = ["yes", "none", "blocked"] as const;
export type EmailState = (typeof EMAIL_STATES)[number];
