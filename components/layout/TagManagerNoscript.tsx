/**
 * Google Tag Manager's fallback for browsers without JavaScript, on the live
 * site only (lib/analytics.ts). CookieConsent loads its script.
 */
export default function TagManagerNoscript({ analytics }: { analytics: boolean }) {
  if (!analytics) return null;
  return (
    <noscript>
      <iframe
        src="https://www.googletagmanager.com/ns.html?id=GTM-K7P36Q7F"
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  );
}
