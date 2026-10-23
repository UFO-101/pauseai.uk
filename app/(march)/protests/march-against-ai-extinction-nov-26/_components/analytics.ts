import type { ShareSource } from "@/lib/content/march-signup";

/** The sign-up's events, as Google Tag Manager gets them. */
export type MarchEvent =
  /** Registered: Luma took them. */
  | { event: "march_signup" }
  /** Shared the message: an app's link pressed, the message copied, or a share sheet's share made. */
  | { event: "march_share"; share_method: ShareSource };

/**
 * Tells Google Tag Manager, through its dataLayer, as the rest of the site
 * does. GTM reads it only once components/layout/CookieConsent.tsx has loaded
 * it: on the live site, for someone who hasn't declined analytics.
 */
export function track(event: MarchEvent) {
  const w = window as typeof window & { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push(event);
}
