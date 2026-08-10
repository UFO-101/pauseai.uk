"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { site } from "@/lib/data/site";

type NavProps = {
  chapterName?: string;
  chapterLogoSrc?: string;
  /** Intrinsic pixel dimensions of chapterLogoSrc — required by next/image
      for aspect ratio; actual display size is driven by the .brand-mark
      CSS (height: 48px; width: auto). */
  chapterLogoWidth?: number;
  chapterLogoHeight?: number;
};

export default function Nav({ chapterName, chapterLogoSrc, chapterLogoWidth, chapterLogoHeight }: NavProps) {
  const pathname = usePathname();
  const isHomepage = pathname === "/";
  const navPrefix = isHomepage ? "" : "/";

  useEffect(() => {
    const header = document.querySelector(".site-header") as HTMLElement | null;
    const burger = document.querySelector(".burger") as HTMLButtonElement | null;
    const nav = document.querySelector("nav") as HTMLElement | null;
    if (!burger || !nav || !header) return;

    const syncHeaderHeight = () => {
      document.documentElement.style.setProperty("--site-header-h", `${header.offsetHeight}px`);
    };
    syncHeaderHeight();
    const resizeObserver = new ResizeObserver(syncHeaderHeight);
    resizeObserver.observe(header);

    const setOpen = (open: boolean) => {
      burger.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("open", open);
      document.body.classList.toggle("mobile-nav-open", open);
    };

    const handleBurgerClick = () => {
      setOpen(burger.getAttribute("aria-expanded") !== "true");
    };

    const handleNavLinkClick = (e: Event) => {
      const link = e.currentTarget as HTMLAnchorElement;
      if (link.classList.contains("dropdown-trigger")) return;
      setOpen(false);
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
      resizeObserver.disconnect();
      document.body.classList.remove("mobile-nav-open");
    };
  }, []);

  return (
    <header className="site-header">
      <div className="container">
        {chapterName ? (
          <Link className="brand brand-link" href="/">
            {chapterLogoSrc ? (
              <Image
                src={chapterLogoSrc}
                alt=""
                width={chapterLogoWidth ?? 178}
                height={chapterLogoHeight ?? 48}
                className="brand-mark"
              />
            ) : (
              <>
                <Image src="/images/logos/Pause-Symbol.svg" alt="" width={616} height={616} className="brand-mark" />
                <div className="brand-text">
                  <span className="brand-pretitle">PauseAI UK</span>
                  <span className="brand-tagline">{chapterName} Chapter</span>
                </div>
              </>
            )}
          </Link>
        ) : (
          <Link className="brand brand-link" href="/">
            <Image
              src="/images/logos/PauseAI-Logo-Transparent.svg"
              alt="PauseAI UK"
              width={178}
              height={48}
              className="brand-mark"
            />
            <span className="brand-uk">UK</span>
          </Link>
        )}
        <button className="burger" aria-label="Menu" aria-expanded="false">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <nav>
          <div className="nav-item has-dropdown">
            <Link href="/what-is-pauseai-uk/" className="dropdown-trigger" aria-haspopup="true" aria-expanded="false">
              About
              <svg className="caret" viewBox="0 0 12 8" aria-hidden="true" focusable={false}>
                <path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <div className="dropdown" role="menu">
              <Link href="/what-is-pauseai-uk/" role="menuitem">What is PauseAI UK?</Link>
              <Link href="/track-record/" role="menuitem">Track record</Link>
              <Link href="/theory-of-change/" role="menuitem">Theory of change</Link>
              <Link href="/governance/" role="menuitem">Governance</Link>
              <Link href="/global-ai-sentiment-2026/" role="menuitem">Global AI sentiment 2026</Link>
            </div>
          </div>
          <div className="nav-item has-dropdown">
            <Link href={`${navPrefix}#chapters`} className="dropdown-trigger" aria-haspopup="true" aria-expanded="false">
              Chapters
              <svg className="caret" viewBox="0 0 12 8" aria-hidden="true" focusable={false}>
                <path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <div className="dropdown" role="menu">
              <Link href="/london/" role="menuitem">London</Link>
              <Link href="/glasgow/" role="menuitem">Glasgow</Link>
              <Link href="/oxford/" role="menuitem">Oxford</Link>
              <Link href="/leicester/" role="menuitem">Leicester</Link>
              <Link href="/manchester/" role="menuitem">Manchester</Link>
              <Link href="/west-of-england/" role="menuitem">West of England</Link>
            </div>
          </div>
          <div className="nav-item has-dropdown">
            <Link href="/campaigns/" className="dropdown-trigger" aria-haspopup="true" aria-expanded="false">
              Campaigns
              <svg className="caret" viewBox="0 0 12 8" aria-hidden="true" focusable={false}>
                <path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <div className="dropdown" role="menu">
              <Link href="/campaigns/" role="menuitem">Frontier AI Legislation</Link>
              <Link href="/future-of-workforce-inquiry/" role="menuitem">Future of the Workforce Inquiry</Link>
            </div>
          </div>
          <Link href="/stories/">Stories</Link>
          <Link href={`${navPrefix}#people`}>People</Link>
          <a href={site.shopUrl} target="_blank" rel="noreferrer">Shop</a>
          <Link href={`${navPrefix}#join`} className="pill">Join</Link>
          <Link href="/donate" className="pill pill-primary">Donate</Link>
        </nav>
      </div>
    </header>
  );
}
