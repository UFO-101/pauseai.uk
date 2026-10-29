import "server-only";
import { getEventGuestCount } from "./outside-services/luma-guests";

// The march's Luma event: the one the sign-up registers people for, and
// whose guests it counts.

/** The march's Luma event (https://luma.com/pauseai-nov26), which production registers people for and every deploy counts. */
const MARCH_EVENT_ID = "evt-1HKCXSHaJqGO3Bg";

/**
 * "Luma API Testing" (https://luma.com/qry332td), a test event on the PauseAI
 * UK calendar, which every other deploy registers people for, so the sign-up can be checked
 * end to end on a deploy preview without joining the march.
 */
const TEST_EVENT_ID = "evt-hfOj1RR5K1gBNEW";

/** The event this deploy registers people for. DEPLOY_CONTEXT is Netlify's CONTEXT, fixed at build time by next.config.ts. */
export function marchEventId(): string {
  return process.env.DEPLOY_CONTEXT === "production" ? MARCH_EVENT_ID : TEST_EVENT_ID;
}

/**
 * How many are going to the march, as getEventGuestCount counts them: the
 * march's own event on every deploy, as reading its count joins no one, so a
 * preview shows the real number.
 */
export function getMarchSignupCount(): Promise<number | null> {
  return getEventGuestCount(MARCH_EVENT_ID);
}
