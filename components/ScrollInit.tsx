"use client";

import { useEffect } from "react";

export default function ScrollInit() {
  useEffect(() => {
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear().toString();

    document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link) => {
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

    if (window.location.hash) {
      const target = document.querySelector(window.location.hash);
      if (target) {
        setTimeout(() => target.scrollIntoView({ behavior: "smooth" }), 100);
      }
    }

    const sections = document.querySelectorAll<HTMLElement>("section[id]");
    let scrollTimer: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        let current = "";
        for (const section of sections) {
          const top = section.getBoundingClientRect().top;
          if (top <= 120) current = section.id;
        }
        const hash = current ? `#${current}` : "";
        if (hash && window.location.hash !== hash) {
          history.replaceState(null, "", hash);
        } else if (!current && window.location.hash) {
          history.replaceState(null, "", window.location.pathname);
        }
      }, 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimer);
    };
  }, []);

  return null;
}
