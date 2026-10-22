"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type AnchorHTMLAttributes } from "react";
import { localGroups } from "@/lib/content/local-groups";
import { site } from "@/lib/content/site";
import Brand from "./Brand";
import styles from "./Nav.module.css";

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
  ["/scotland/", "Scotland"],
  ["/oxford/", "Oxford"],
  ["/leicester/", "Leicester"],
  ["/manchester/", "Manchester"],
  ["/west-of-england/", "West of England"],
];
const CAMPAIGN_LINKS = [
  ["/campaigns/regulate-letter-pm/", "Regulate AI developers now"],
  ["/campaigns/support-sobel-bill/", "Support the Artificial Superintelligence Bill"],
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
  // The dropdown a link was just chosen from. It stays shut, though the
  // pointer is still over it, across the navigation, until the pointer
  // leaves it or something in it is focused again.
  const [dismissed, setDismissed] = useState<number | null>(null);

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
    <header className={styles.header} ref={header}>
      <div className={`container ${styles.bar}`}>
        <Brand home localGroup={localGroup} />
        <button
          className={styles.burger}
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => update({ open: !open })}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <nav className={open ? `${styles.links} ${styles.open}` : styles.links}>
          {dropdowns.map(({ label, href, links }, i) => (
            <div
              key={label}
              className={[
                styles.item,
                styles.hasDropdown,
                dropdown === i && styles.isOpen,
                dismissed === i && styles.isDismissed,
              ]
                .filter(Boolean)
                .join(" ")}
              ref={(item) => {
                dropdownItems.current[i] = item;
              }}
              onPointerLeave={() => setDismissed(null)}
              onFocus={() => setDismissed(null)}
            >
              <SiteLink
                href={href}
                className={styles.trigger}
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
                <svg className={styles.caret} viewBox="0 0 12 8" aria-hidden="true" focusable={false}>
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
              <div className={styles.dropdown} role="menu">
                {links.map(([linkHref, linkLabel]) => (
                  <Link
                    key={linkHref}
                    href={linkHref}
                    role="menuitem"
                    onClick={(e) => {
                      // Neither the pointer still over it nor focus left on
                      // the link holds it open on the new page.
                      e.currentTarget.blur();
                      setDismissed(i);
                      closeMenu();
                    }}
                  >
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
          <SiteLink href={`${navPrefix}#join`} className={styles.pill} onClick={closeMenu}>
            Join
          </SiteLink>
          <Link href="/donate" className={`${styles.pill} ${styles.pillPrimary}`} onClick={closeMenu}>
            Donate
          </Link>
        </nav>
      </div>
    </header>
  );
}
