"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type AnchorHTMLAttributes } from "react";
import { localGroups } from "@/lib/content/local-groups";
import { site } from "@/lib/content/site";

// Each dropdown's links: [href, label].
const ABOUT_LINKS = [
  ["/what-is-pauseai-uk/", "What is PauseAI UK?"],
  ["/track-record/", "Track record"],
  ["/theory-of-change/", "Theory of change"],
  ["/governance/", "Governance"],
  ["/global-ai-sentiment-2026/", "Global AI sentiment 2026"],
  ["/jobs/", "Jobs"],
];
const LOCAL_GROUP_LINKS = [
  ["/london/", "London"],
  ["/glasgow/", "Glasgow"],
  ["/oxford/", "Oxford"],
  ["/leicester/", "Leicester"],
  ["/manchester/", "Manchester"],
  ["/west-of-england/", "West of England"],
];
const CAMPAIGN_LINKS = [
  ["/campaigns/", "Regulate AI developers now"],
  ["/future-of-workforce-inquiry/", "Future of the Workforce Inquiry"],
];

/**
 * A link to a page, or to a place on this one. The latter is a plain <a>:
 * the browser scrolls to the fragment even when it's already in the URL,
 * where Next's Link sees the same URL and does nothing.
 */
function SiteLink({ href, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return href.startsWith("#") ? <a href={href} {...rest} /> : <Link href={href} {...rest} />;
}

/** The mobile menu is open, and which dropdown is, by its place in the nav. */
const CLOSED = { open: false, dropdown: null as number | null };
type MenuState = typeof CLOSED & { pathname: string };

export default function Nav() {
  const pathname = usePathname();
  const isHomepage = pathname === "/";
  const navPrefix = isHomepage ? "" : "/";
  // A local group's page carries its branding in the header.
  const localGroup = localGroups.find((group) => group.href === pathname.replace(/\/$/, ""));

  // The header lives in a layout, so it stays mounted across navigation.
  // The menu's state notes the page it was set on, so each new page starts
  // with the menu and dropdowns closed, as a freshly mounted header would.
  const [menu, setMenu] = useState<MenuState>({ ...CLOSED, pathname });
  const { open, dropdown } = menu.pathname === pathname ? menu : CLOSED;
  const update = useCallback(
    (change: Partial<typeof CLOSED>) =>
      setMenu((current) => ({ ...(current.pathname === pathname ? current : CLOSED), ...change, pathname })),
    [pathname],
  );
  const closeMenu = () => update({ open: false });

  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    // The stylesheet positions the mobile menu and in-page anchors below the header.
    const syncHeaderHeight = () => {
      document.documentElement.style.setProperty("--site-header-h", `${header.current!.offsetHeight}px`);
    };
    syncHeaderHeight();
    const resizeObserver = new ResizeObserver(syncHeaderHeight);
    resizeObserver.observe(header.current!);
    return () => resizeObserver.disconnect();
  }, []);

  // A tap outside the dropdowns closes an open one.
  const dropdownItems = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    if (dropdown === null) return;
    const handleDocClick = (e: MouseEvent) => {
      if (!dropdownItems.current.some((item) => item!.contains(e.target as Node))) update({ dropdown: null });
    };
    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, [dropdown, update]);

  const dropdowns = [
    { label: "About", href: "/what-is-pauseai-uk/", links: ABOUT_LINKS },
    { label: "Local groups", href: `${navPrefix}#local-groups`, links: LOCAL_GROUP_LINKS },
    { label: "Campaigns", href: "/campaigns/", links: CAMPAIGN_LINKS },
  ];

  return (
    <header className="site-header" ref={header}>
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
        <button className="burger" aria-label="Menu" aria-expanded={open} onClick={() => update({ open: !open })}>
          <span></span>
          <span></span>
          <span></span>
        </button>
        <nav className={open ? "open" : undefined}>
          {dropdowns.map(({ label, href, links }, i) => (
            <div
              key={label}
              className={dropdown === i ? "nav-item has-dropdown is-open" : "nav-item has-dropdown"}
              ref={(item) => {
                dropdownItems.current[i] = item;
              }}
            >
              <SiteLink
                href={href}
                className="dropdown-trigger"
                aria-haspopup="true"
                aria-expanded={dropdown === i}
                onClick={(e) => {
                  // Touch screens have no hover, so the first tap opens the
                  // dropdown and a second follows the link. Following it
                  // closes the menu, like any other link: the page it leads
                  // to may be this one (/#local-groups).
                  if (window.matchMedia("(hover: none)").matches && dropdown !== i) {
                    e.preventDefault();
                    update({ dropdown: i });
                  } else {
                    update(CLOSED);
                  }
                }}
              >
                {label}
                <svg className="caret" viewBox="0 0 12 8" aria-hidden="true" focusable={false}>
                  <path
                    d="M1 1.5l5 5 5-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </SiteLink>
              <div className="dropdown" role="menu">
                {links.map(([linkHref, linkLabel]) => (
                  <Link key={linkHref} href={linkHref} role="menuitem" onClick={closeMenu}>
                    {linkLabel}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <Link href="/people/" onClick={closeMenu}>
            People
          </Link>
          <Link href="/blog/" onClick={closeMenu}>
            Blog
          </Link>
          <a href={site.shopUrl} target="_blank" rel="noreferrer" onClick={closeMenu}>
            Shop
          </a>
          <SiteLink href={`${navPrefix}#join`} className="pill" onClick={closeMenu}>
            Join
          </SiteLink>
          <Link href="/donate" className="pill pill-primary" onClick={closeMenu}>
            Donate
          </Link>
        </nav>
      </div>
    </header>
  );
}
