// ── Cookie consent + Google Analytics (consent-gated) ──────────────
// Analytics cookies require prior consent under UK GDPR / PECR, so GA is
// only loaded after the visitor accepts. The choice is remembered in
// localStorage. Pages with a `data-no-analytics` <body> (the donate page)
// stay analytics- and banner-free.
(function () {
  if (document.body && document.body.hasAttribute("data-no-analytics")) return;

  const GA_MEASUREMENT_ID = "G-DLLRWZCYD7";
  const CONSENT_KEY = "pauseai-cookie-consent"; // 'accepted' | 'declined'

  function loadGoogleAnalytics() {
    if (window.__gaLoaded) return;
    window.__gaLoaded = true;
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_MEASUREMENT_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID);
  }

  function buildBanner() {
    const banner = document.createElement("div");
    banner.className = "cookie-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Cookie consent");
    banner.innerHTML =
      '<p class="cookie-banner-text">Cookies help PauseAI UK understand how this ' +
      "site is used, so we can make it work better for you. You can accept or " +
      'decline these analytics cookies — see our <a href="/privacy">privacy policy</a>.</p>' +
      '<div class="cookie-banner-actions">' +
      '<button type="button" class="btn ghost small js-cookie-decline">Decline</button>' +
      '<button type="button" class="btn primary small js-cookie-accept">Accept</button>' +
      "</div>";
    document.body.appendChild(banner);
    banner.querySelector(".js-cookie-accept").addEventListener("click", () => {
      localStorage.setItem(CONSENT_KEY, "accepted");
      loadGoogleAnalytics();
      banner.remove();
    });
    banner.querySelector(".js-cookie-decline").addEventListener("click", () => {
      localStorage.setItem(CONSENT_KEY, "declined");
      banner.remove();
    });
  }

  function showBanner() {
    if (!document.querySelector(".cookie-banner")) buildBanner();
  }

  const consent = localStorage.getItem(CONSENT_KEY);
  if (consent === "accepted") {
    loadGoogleAnalytics();
  } else if (consent === null) {
    document.addEventListener("DOMContentLoaded", showBanner);
  }

  // "Cookie settings" links (e.g. in the footer) re-open the banner.
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".js-cookie-settings").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        showBanner();
      });
    });
  });
})();

document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear().toString();

  // Burger menu toggle
  const burger = document.querySelector(".burger");
  const nav = document.querySelector("nav");
  if (burger && nav) {
    burger.addEventListener("click", () => {
      const open = burger.getAttribute("aria-expanded") === "true";
      burger.setAttribute("aria-expanded", !open);
      nav.classList.toggle("open", !open);
    });
    // Close menu when a nav link is clicked (but not when toggling a dropdown)
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (link.classList.contains("dropdown-trigger")) return;
        burger.setAttribute("aria-expanded", "false");
        nav.classList.remove("open");
      });
    });
  }

  // Dropdown nav toggle.
  // - Hover-capable devices (desktop): the dropdown reveals on hover via CSS,
  //   so clicking the trigger should navigate normally.
  // - Touch devices: first tap opens the dropdown (preventDefault); a second
  //   tap on the same trigger navigates. Tapping a sub-item always navigates.
  document.querySelectorAll(".dropdown-trigger").forEach((trigger) => {
    const parent = trigger.closest(".nav-item.has-dropdown");
    if (!parent) return;
    trigger.addEventListener("click", (e) => {
      const isTouch = window.matchMedia("(hover: none)").matches;
      if (!isTouch) return;
      const isOpen = parent.classList.contains("is-open");
      if (!isOpen) {
        e.preventDefault();
        document.querySelectorAll(".nav-item.has-dropdown.is-open").forEach((p) => {
          if (p !== parent) {
            p.classList.remove("is-open");
            p.querySelector(".dropdown-trigger")?.setAttribute("aria-expanded", "false");
          }
        });
        parent.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
      } else {
        parent.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
      }
    });
  });

  // Close any open dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav-item.has-dropdown")) {
      document.querySelectorAll(".nav-item.has-dropdown.is-open").forEach((p) => {
        p.classList.remove("is-open");
        p.querySelector(".dropdown-trigger")?.setAttribute("aria-expanded", "false");
      });
    }
  });

  // Smooth scroll for internal links + update URL hash
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const targetId = link.getAttribute("href");
      if (!targetId || targetId === "#") return;
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
      history.pushState(null, "", targetId);
    });
  });

  // Scroll to hash on page load
  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target) {
      setTimeout(() => target.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  // Hydrate deferred iframes after initial render
  document
    .querySelectorAll("iframe[data-src]")
    .forEach((el) => (el.src = el.dataset.src));

  // Update URL hash on scroll based on visible section
  const sections = document.querySelectorAll("section[id]");
  let scrollTimer;
  window.addEventListener("scroll", () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      let current = "";
      for (const section of sections) {
        const top = section.getBoundingClientRect().top;
        if (top <= 120) current = section.id;
      }
      const hash = current ? "#" + current : "";
      if (hash && window.location.hash !== hash) {
        history.replaceState(null, "", hash);
      } else if (!current && window.location.hash) {
        history.replaceState(null, "", window.location.pathname);
      }
    }, 100);
  });
});
