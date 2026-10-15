"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

const GA_ID = "G-DLLRWZCYD7";
const GTM_ID = "GTM-K7P36Q7F";
const CONSENT_KEY = "pauseai-cookie-consent";
// GA reads this global before every hit; setting it true stops gtag.js
// from sending any data, even after the script has loaded.
const GA_DISABLE_KEY = `ga-disable-${GA_ID}`;

type GAWindow = typeof window & {
  __gaLoaded?: boolean;
  __gtmLoaded?: boolean;
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

function setGADisabled(disabled: boolean) {
  (window as unknown as Record<string, unknown>)[GA_DISABLE_KEY] = disabled;
}

// Google Tag Manager (Google Ads). Loaded behind the same consent gate as GA,
// so a "declined" choice keeps it off. The <noscript> fallback lives in layout.tsx.
function loadGTM() {
  const w = window as GAWindow;
  if (w.__gtmLoaded) return;
  w.__gtmLoaded = true;

  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(s);
}

function loadGA() {
  loadGTM();
  const w = window as GAWindow;
  if (w.__gaLoaded) return;
  w.__gaLoaded = true;

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);

  // loadGTM above has made dataLayer.
  w.gtag = function () {
    // gtag.js only executes commands pushed as an Arguments object
    // (it checks Object.prototype.toString === "[object Arguments]").
    // Pushing a rest-param array here silently disables all tracking.
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  w.gtag("js", new Date());
  w.gtag("config", GA_ID);
}

/** The host itself, then every parent domain a cookie could be set on: "www.pauseai.uk" gives ".www.pauseai.uk" and ".pauseai.uk" too. */
export function cookieDomains(hostname: string): string[] {
  const parts = hostname.split(".");
  const domains = [hostname];
  for (let i = 0; i < parts.length - 1; i++) {
    domains.push("." + parts.slice(i).join("."));
  }
  return domains;
}

// Expire GA's cookies on the current host and every parent domain so the
// _ga / _gid identifiers don't survive an opt-out.
function clearGACookies() {
  const domains = cookieDomains(location.hostname);
  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0].trim();
    if (name.indexOf("_ga") === 0 || name === "_gid") {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      domains.forEach((d) => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${d}`;
      });
    }
  });
}

// localStorage throws in contexts where site data is blocked (e.g. some
// private-browsing modes, or cookies disabled) — a read/write shouldn't
// take down the whole consent effect.
function readConsent(): string | null {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

function writeConsent(value: string) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Best effort — if storage is blocked, the choice just won't persist.
  }
}

/** Opens the cookie banner. */
const CookieSettings = createContext<(() => void) | null>(null);

/**
 * Loads analytics, unless someone has declined it, and shows the cookie
 * banner when a CookieSettingsLink inside it asks.
 */
export default function CookieConsent({ children }: { children: ReactNode }) {
  const [bannerOpen, setBannerOpen] = useState(false);

  useEffect(() => {
    if (document.body.hasAttribute("data-no-analytics")) return;

    // Analytics loads by default. The banner isn't shown on first visit,
    // but the footer "Cookie settings" link can open it on demand, and a
    // prior "declined" choice is honoured: GA stays disabled and unloaded.
    if (readConsent() === "declined") {
      setGADisabled(true);
    } else {
      loadGA();
    }
  }, []);

  const openBanner = useCallback(() => {
    // Pages without analytics have no choice to make.
    if (!document.body.hasAttribute("data-no-analytics")) setBannerOpen(true);
  }, []);

  const accept = () => {
    writeConsent("accepted");
    setGADisabled(false);
    loadGA();
    setBannerOpen(false);
  };
  const decline = () => {
    writeConsent("declined");
    // Stop any already-running tracking and drop the cookies immediately.
    setGADisabled(true);
    clearGACookies();
    setBannerOpen(false);
  };

  return (
    <CookieSettings.Provider value={openBanner}>
      {children}
      {bannerOpen && (
        <div className="cookie-banner" role="dialog" aria-label="Cookie consent">
          <p className="cookie-banner-text">
            Cookies help PauseAI UK understand how this site is used, so we can make it work better for you. You can
            accept or decline these analytics cookies — see our <a href="/privacy">privacy policy</a>.
          </p>
          <div className="cookie-banner-actions">
            <Button type="button" variant="ghost" size="small" onClick={decline}>
              Decline
            </Button>
            <Button type="button" variant="primary" size="small" onClick={accept}>
              Accept
            </Button>
          </div>
        </div>
      )}
    </CookieSettings.Provider>
  );
}

/** The footer's link that opens the cookie banner. It goes inside CookieConsent. */
export function CookieSettingsLink() {
  const openBanner = useContext(CookieSettings)!;
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        openBanner();
      }}
    >
      Cookie settings
    </a>
  );
}
