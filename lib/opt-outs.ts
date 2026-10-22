// The mailing lists an address can opt out of (lib/server/opt-outs.ts),
// named for the staff pages too.

export const OPT_OUT_LISTS = ["luma-calendar", "pauseai-updates"] as const;
export type OptOutList = (typeof OPT_OUT_LISTS)[number];
