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

  // Dropdown nav toggle (works for click, touch, and keyboard)
  document.querySelectorAll(".dropdown-trigger").forEach((trigger) => {
    const parent = trigger.closest(".nav-item.has-dropdown");
    if (!parent) return;
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      const isOpen = parent.classList.contains("is-open");
      document.querySelectorAll(".nav-item.has-dropdown.is-open").forEach((p) => {
        if (p !== parent) {
          p.classList.remove("is-open");
          p.querySelector(".dropdown-trigger")?.setAttribute("aria-expanded", "false");
        }
      });
      parent.classList.toggle("is-open", !isOpen);
      trigger.setAttribute("aria-expanded", String(!isOpen));
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
