"use client";

import { useEffect } from "react";

const GA_ID = "G-DLLRWZCYD7";
const CONSENT_KEY = "pauseai-cookie-consent";

function loadGA() {
  if ((window as typeof window & { __gaLoaded?: boolean }).__gaLoaded) return;
  (window as typeof window & { __gaLoaded?: boolean }).__gaLoaded = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
  (window as typeof window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }).dataLayer =
    (window as typeof window & { dataLayer?: unknown[] }).dataLayer || [];
  (window as typeof window & { gtag?: (...args: unknown[]) => void }).gtag = function (...args: unknown[]) {
    (window as typeof window & { dataLayer?: unknown[] }).dataLayer!.push(args);
  };
  (window as typeof window & { gtag?: (...args: unknown[]) => void }).gtag!("js", new Date());
  (window as typeof window & { gtag?: (...args: unknown[]) => void }).gtag!("config", GA_ID);
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
    localStorage.setItem(CONSENT_KEY, "accepted");
    loadGA();
    banner.remove();
  });
  banner.querySelector(".js-cookie-decline")!.addEventListener("click", () => {
    localStorage.setItem(CONSENT_KEY, "declined");
    banner.remove();
  });
}

export default function CookieConsent() {
  useEffect(() => {
    if (document.body.hasAttribute("data-no-analytics")) return;
    const consent = localStorage.getItem(CONSENT_KEY);
    if (consent === "accepted") {
      loadGA();
    } else if (consent === null) {
      buildBanner();
    }

    document.querySelectorAll(".js-cookie-settings").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        buildBanner();
      });
    });
  }, []);

  return null;
}
