"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { localGroups } from "@/lib/data/local-groups";
import { site } from "@/lib/data/site";

export default function Nav() {
  const pathname = usePathname();
  const isHomepage = pathname === "/";
  const navPrefix = isHomepage ? "" : "/";
  // A local group's page carries its branding in the header.
  const localGroup = localGroups.find((group) => group.href === pathname.replace(/\/$/, ""));

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

  // The header lives in a layout, so it stays mounted across navigation.
  // Start each new page with the menu and dropdowns closed, as a freshly
  // mounted header would be.
  useEffect(() => {
    document.querySelector(".burger")?.setAttribute("aria-expanded", "false");
    document.querySelector("header.site-header nav")?.classList.remove("open");
    document.body.classList.remove("mobile-nav-open");
    document.querySelectorAll<HTMLElement>(".nav-item.has-dropdown.is-open").forEach((item) => {
      item.classList.remove("is-open");
      item.querySelector(".dropdown-trigger")?.setAttribute("aria-expanded", "false");
    });
  }, [pathname]);

  return (
    <header className="site-header">
      <div className="container">
        {localGroup ? (
          <Link className="brand brand-link" href="/">
            {localGroup.logo ? (
              <Image
                src={localGroup.logo.src}
                alt=""
                width={localGroup.logo.width}
                height={localGroup.logo.height}
                className="brand-mark"
              />
            ) : (
              <>
                <Image src="/images/logos/Pause-Symbol.svg" alt="" width={616} height={616} className="brand-mark" />
                <div className="brand-text">
                  <span className="brand-pretitle">PauseAI UK</span>
                  <span className="brand-tagline">{localGroup.name} Group</span>
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
              <Link href="/jobs/" role="menuitem">Jobs</Link>
            </div>
          </div>
          <div className="nav-item has-dropdown">
            <Link href={`${navPrefix}#local-groups`} className="dropdown-trigger" aria-haspopup="true" aria-expanded="false">
              Local groups
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
          <Link href="/people/">People</Link>
          <Link href="/blog/">Blog</Link>
          <a href={site.shopUrl} target="_blank" rel="noreferrer">Shop</a>
          <Link href={`${navPrefix}#join`} className="pill">Join</Link>
          <Link href="/donate" className="pill pill-primary">Donate</Link>
        </nav>
      </div>
    </header>
  );
}
