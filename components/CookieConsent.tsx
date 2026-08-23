"use client";

import { useEffect } from "react";

const GA_ID = "G-DLLRWZCYD7";
const CONSENT_KEY = "pauseai-cookie-consent";
// GA reads this global before every hit; setting it true stops gtag.js
// from sending any data, even after the script has loaded.
const GA_DISABLE_KEY = `ga-disable-${GA_ID}`;

type GAWindow = typeof window & {
  __gaLoaded?: boolean;
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

function setGADisabled(disabled: boolean) {
  (window as unknown as Record<string, unknown>)[GA_DISABLE_KEY] = disabled;
}

function loadGA() {
  const w = window as GAWindow;
  if (w.__gaLoaded) return;
  w.__gaLoaded = true;

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);

  w.dataLayer = w.dataLayer || [];
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

// Expire GA's cookies on the current host and every parent domain so the
// _ga / _gid identifiers don't survive an opt-out.
function clearGACookies() {
  const parts = location.hostname.split(".");
  const domains = [location.hostname];
  for (let i = 0; i < parts.length - 1; i++) {
    domains.push("." + parts.slice(i).join("."));
  }
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

function buildBanner() {
  if (document.querySelector(".cookie-banner")) return;
  const banner = document.createElement("div");
  banner.className = "cookie-banner";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-label", "Cookie consent");
  banner.innerHTML =
    '<p class="cookie-banner-text">Cookies help PauseAI UK understand how this site is used, so we can make it work better for you. You can accept or decline these analytics cookies — see our <a href="/privacy">privacy policy</a>.</p>' +
    '<div class="cookie-banner-actions">' +
    '<button type="button" class="btn ghost small js-cookie-decline">Decline</button>' +
    '<button type="button" class="btn primary small js-cookie-accept">Accept</button>' +
    "</div>";
  document.body.appendChild(banner);
  banner.querySelector(".js-cookie-accept")!.addEventListener("click", () => {
    writeConsent("accepted");
    setGADisabled(false);
    loadGA();
    banner.remove();
  });
  banner.querySelector(".js-cookie-decline")!.addEventListener("click", () => {
    writeConsent("declined");
    // Stop any already-running tracking and drop the cookies immediately.
    setGADisabled(true);
    clearGACookies();
    banner.remove();
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

export default function CookieConsent() {
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

    const handleSettingsClick = (e: Event) => {
      e.preventDefault();
      buildBanner();
    };
    const settingsLinks = document.querySelectorAll(".js-cookie-settings");
    settingsLinks.forEach((el) => el.addEventListener("click", handleSettingsClick));

    return () => {
      settingsLinks.forEach((el) => el.removeEventListener("click", handleSettingsClick));
    };
  }, []);

  return null;
}
