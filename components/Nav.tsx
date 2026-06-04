"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { site } from "@/lib/data/site";

type NavProps = {
  chapterName?: string;
  chapterLogoSrc?: string;
};

export default function Nav({ chapterName, chapterLogoSrc }: NavProps) {
  const pathname = usePathname();
  const isHomepage = pathname === "/";
  const navPrefix = isHomepage ? "" : "/";

  useEffect(() => {
    const burger = document.querySelector(".burger") as HTMLButtonElement | null;
    const nav = document.querySelector("nav") as HTMLElement | null;
    if (!burger || !nav) return;

    const handleBurgerClick = () => {
      const open = burger.getAttribute("aria-expanded") === "true";
      burger.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("open", !open);
    };

    const handleNavLinkClick = (e: Event) => {
      const link = e.currentTarget as HTMLAnchorElement;
      if (link.classList.contains("dropdown-trigger")) return;
      burger.setAttribute("aria-expanded", "false");
      nav.classList.remove("open");
    };

    burger.addEventListener("click", handleBurgerClick);
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", handleNavLinkClick);
    });

    const triggers = document.querySelectorAll<HTMLElement>(".dropdown-trigger");
    const handleTriggerClick = (e: Event) => {
      const trigger = e.currentTarget as HTMLElement;
      const parent = trigger.closest(".nav-item.has-dropdown") as HTMLElement | null;
      if (!parent) return;
      const isTouch = window.matchMedia("(hover: none)").matches;
      if (!isTouch) return;
      const isOpen = parent.classList.contains("is-open");
      if (!isOpen) {
        e.preventDefault();
        document.querySelectorAll<HTMLElement>(".nav-item.has-dropdown.is-open").forEach((p) => {
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
    };

    const handleDocClick = (e: MouseEvent) => {
      if (!(e.target as Element).closest(".nav-item.has-dropdown")) {
        document.querySelectorAll<HTMLElement>(".nav-item.has-dropdown.is-open").forEach((p) => {
          p.classList.remove("is-open");
          p.querySelector(".dropdown-trigger")?.setAttribute("aria-expanded", "false");
        });
      }
    };

    triggers.forEach((t) => t.addEventListener("click", handleTriggerClick));
    document.addEventListener("click", handleDocClick);

    return () => {
      burger.removeEventListener("click", handleBurgerClick);
      nav.querySelectorAll("a").forEach((link) => {
        link.removeEventListener("click", handleNavLinkClick);
      });
      triggers.forEach((t) => t.removeEventListener("click", handleTriggerClick));
      document.removeEventListener("click", handleDocClick);
    };
  }, []);

  return (
    <header className="site-header">
      <div className="container">
        {chapterName ? (
          <a className="brand brand-link" href="/">
            {chapterLogoSrc ? (
              <img src={chapterLogoSrc} alt="" className="brand-mark" />
            ) : (
              <>
                <img src="/images/logos/Pause Symbol.svg" alt="" className="brand-mark" />
                <div className="brand-text">
                  <span className="brand-pretitle">PauseAI UK</span>
                  <span className="brand-tagline">{chapterName} Chapter</span>
                </div>
              </>
            )}
          </a>
        ) : (
          <a className="brand brand-link" href="/">
            <img
              src="/images/logos/PauseAI Logo Transparent.svg"
              alt="PauseAI UK"
              width={178}
              height={48}
              className="brand-mark"
            />
            <span className="brand-uk">UK</span>
          </a>
        )}
        <button className="burger" aria-label="Menu" aria-expanded="false">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <nav>
          <div className="nav-item has-dropdown">
            <a href="/track-record/" className="dropdown-trigger" aria-haspopup="true" aria-expanded="false">
              About
              <svg className="caret" viewBox="0 0 12 8" aria-hidden="true" focusable={false}>
                <path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <div className="dropdown" role="menu">
              <a href="/track-record/" role="menuitem">Track record</a>
              <a href="/theory-of-change/" role="menuitem">Theory of change</a>
            </div>
          </div>
          <div className="nav-item has-dropdown">
            <a href={`${navPrefix}#chapters`} className="dropdown-trigger" aria-haspopup="true" aria-expanded="false">
              Chapters
              <svg className="caret" viewBox="0 0 12 8" aria-hidden="true" focusable={false}>
                <path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <div className="dropdown" role="menu">
              <a href="/london/" role="menuitem">London</a>
              <a href="/glasgow/" role="menuitem">Glasgow</a>
              <a href="/oxford/" role="menuitem">Oxford</a>
              <a href="/leicester/" role="menuitem">Leicester</a>
              <a href="/manchester/" role="menuitem">Manchester</a>
            </div>
          </div>
          <a href="/campaigns/">Campaigns</a>
          <a href={`${navPrefix}#stories`}>Stories</a>
          <a href={`${navPrefix}#people`}>People</a>
          <a href={site.shopUrl} target="_blank" rel="noreferrer">Shop</a>
          <a href={`${navPrefix}#join`} className="pill">Join</a>
          <a href="/donate" className="pill pill-primary">Donate</a>
        </nav>
      </div>
    </header>
  );
}
