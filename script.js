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
    // Close menu when a nav link is clicked
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        burger.setAttribute("aria-expanded", "false");
        nav.classList.remove("open");
      });
    });
  }

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const targetId = link.getAttribute("href");
      if (!targetId || targetId === "#") return;
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
    });
  });
});
