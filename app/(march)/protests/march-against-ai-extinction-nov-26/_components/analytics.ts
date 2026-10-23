import type { ShareSource } from "@/lib/content/march-signup";

/** The sign-up's events, as Google Analytics gets them. */
export type MarchEvent =
  /** Registered: Luma took them. */
  | { event: "march_signup" }
  /** Shared the message: an app's link pressed, the message copied, or a share sheet's share made. */
  | { event: "march_share"; share_method: ShareSource };

/**
 * Sends the event straight to Google Analytics through gtag, not through
 * Google Tag Manager, so it needs no tag in GTM. gtag is there only once
 * components/layout/CookieConsent.tsx has loaded GA: on the live site, for
 * someone who hasn't declined analytics. Without it, nothing is sent.
 */
export function track({ event, ...params }: MarchEvent) {
  const w = window as typeof window & { gtag?: (...args: unknown[]) => void };
  w.gtag?.("event", event, params);
}
