"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Permission } from "@/lib/staff-permissions";
import { sectionsFor, staffPageOf, type StaffPageId } from "@/lib/staff-sections";
import NavIcon from "./NavIcon";
import NavFold from "./ui/NavFold";
import StaffLink from "./ui/StaffLink";
import styles from "./StaffNav.module.css";

/** The pages the navigation can mark as current: the home page, your own page, or any page in a section. */
export type StaffPage = "home" | "me" | StaffPageId;

/** Your own page: your Gmail and your sessions. */
const ME_PATH = "/staff/me";

/** The page the navigation marks at `path`: the home page, your own page, or the page in a section it's under. */
export function staffPageAt(path: string): StaffPage | undefined {
  if (path === "/staff") return "home";
  if (path === ME_PATH) return "me";
  return staffPageOf(path)?.id;
}

type Props = {
  /** Who's logged in. Without it, on the login page, just the title. */
  email?: string;
  /** Their permissions, which decide the pages they see. */
  permissions?: Permission[];
  /** How many sessions they have open: with more than one, a faint link under Log out to them, on their own page. */
  sessions?: number;
  /** The page to mark, as the component gallery shows it; otherwise the one the URL is (staffPageAt). */
  current?: StaffPage;
};

/**
 * The staff interface's navigation: a sidebar with Home, then the pages in
 * sections, the current one marked but still a link, so it's the way back from a page
 * under it; who's logged in and the way out; on a phone, a bar with the
 * current page's name opening the same as a dropdown. Who's logged in is a
 * link to their own page, of their Gmail and sessions. Each page has its
 * icon beside its name. On wider screens, a button on its edge by the title folds the
 * sidebar to a rail of the icons, the sections a rule apart, each page's
 * name showing beside its icon on hover. Under Log out, with
 * more than one session open, a faint link to them. Each page shows
 * only to those with its permission (lib/staff-sections.ts). The pause symbol and name at the top are the
 * way to the home page. It's drawn once, by the signed-in pages' layout, and
 * stays as they change, marking the page the URL is; the phone's dropdown
 * closes when it does.
 */
export default function StaffNav({ email, permissions = [], sessions = 1, current: shown }: Props) {
  const path = usePathname();
  const current = shown ?? staffPageAt(path);
  // The pause symbol and the name: the way home, except at home.
  const mark = (
    <>
      <Image src="/images/logos/Pause-Symbol.svg" alt="" width={616} height={616} className={styles.mark} priority />
      <span className={styles.name}>{staffCopy.nav.title}</span>
    </>
  );
  const title =
    current === "home" ? (
      <span className={styles.title}>{mark}</span>
    ) : (
      <StaffLink href="/staff" className={styles.title}>
        {mark}
      </StaffLink>
    );
  if (!email) return <div className={styles.bar}>{title}</div>;

  // Home first, on its own, then the sections.
  const home = (
    <section className={styles.group}>
      <ul>
        <li>
          <StaffLink href="/staff" className={styles.page} aria-current={current === "home" ? "page" : undefined}>
            <NavIcon id="home" />
            <span className={styles.label}>{staffCopy.nav.home}</span>
          </StaffLink>
        </li>
      </ul>
    </section>
  );
  const groups = sectionsFor(permissions).map((section) => (
    <section key={section.id} className={styles.group}>
      <h2>{staffCopy.nav.sections[section.id]}</h2>
      <ul>
        {section.pages.map((page) => (
          <li key={page.id}>
            <StaffLink href={page.href} className={styles.page} aria-current={page.id === current ? "page" : undefined}>
              <NavIcon id={page.id} />
              <span className={styles.label}>{staffCopy.nav[page.id]}</span>
            </StaffLink>
          </li>
        ))}
      </ul>
    </section>
  ));
  // Your address with an @, as a page under its own heading; in the sidebar on one line, cut short if it's long, the whole address on hover.
  const profile = (
    <section className={styles.group}>
      <h2>{staffCopy.nav.sections.profile}</h2>
      <ul>
        <li>
          <StaffLink
            href={ME_PATH}
            className={`${styles.page} ${styles.address}`}
            title={email}
            aria-current={current === "me" ? "page" : undefined}
          >
            <NavIcon id="me" />
            <span className={styles.label}>{email}</span>
          </StaffLink>
        </li>
      </ul>
    </section>
  );
  const others = sessions > 1 && (
    <StaffLink href={`${ME_PATH}#sessions`} className={styles.sessions}>
      {staffCopy.nav.sessions(sessions)}
    </StaffLink>
  );
  return (
    <nav className={styles.nav} aria-label={staffCopy.nav.title}>
      {title}
      {/* On wider screens, on the sidebar's edge, level with the title. */}
      <NavFold />
      {/* Wider screens: the groups down the side, then who's logged in and the way out. */}
      <div className={styles.sidebar}>
        {home}
        {groups}
        <div className={styles.foot}>
          {profile}
          <form method="post" action="/staff/api/logout">
            <button type="submit" className={styles.page}>
              <NavIcon id="logout" />
              <span className={styles.label}>{staffCopy.nav.logout}</span>
            </button>
          </form>
          {others}
        </div>
      </div>
      {/* A phone: a dropdown at the right of the bar, the current page with an arrow. */}
      <details key={path} className={styles.menu}>
        <summary>{current && (current === "me" ? staffCopy.me.title : staffCopy.nav[current])}</summary>
        <div>
          {home}
          {groups}
          {profile}
          <form method="post" action="/staff/api/logout">
            <button type="submit" className={styles.linkButton}>
              {staffCopy.nav.logout}
            </button>
          </form>
          {others}
        </div>
      </details>
    </nav>
  );
}
