"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Permission } from "@/lib/staff-permissions";
import { sectionsFor, staffPageOf, type StaffPageId } from "@/lib/staff-sections";
import NavIcon from "./NavIcon";
import NavFold from "./ui/NavFold";
import styles from "./StaffNav.module.css";

/** The pages the navigation can mark as current: the home page, your sessions, or any page in a section. */
export type StaffPage = "home" | "sessions" | StaffPageId;

/** The page the navigation marks at `path`: the home page, your sessions, or the page in a section it's under. */
export function staffPageAt(path: string): StaffPage | undefined {
  if (path === "/staff") return "home";
  if (path === "/staff/sessions") return "sessions";
  return staffPageOf(path)?.id;
}

type Props = {
  /** Who's logged in. Without it, on the login page, just the title. */
  email?: string;
  /** Their permissions, which decide the pages they see. */
  permissions?: Permission[];
  /** How many sessions they have open: with more than one, a faint link under Log out to the page of them. */
  sessions?: number;
  /** The page to mark, as the component gallery shows it; otherwise the one the URL is (staffPageAt). */
  current?: StaffPage;
};

/**
 * The staff interface's navigation: a sidebar with Home, then the pages in
 * sections, the current one marked but still a link, so it's the way back from a page
 * under it; who's logged in and the way out; on a phone, a bar with the
 * current page's name opening the same as a dropdown. Each page has its
 * icon beside its name. On wider screens, a button at the foot folds the
 * sidebar to a rail of the icons, the sections a rule apart, each page's
 * name showing beside its icon on hover. Under Log out, with
 * more than one session open, a faint link to the page of them. Each page shows
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
      <Link href="/staff" className={styles.title}>
        {mark}
      </Link>
    );
  if (!email) return <div className={styles.bar}>{title}</div>;

  // Home first, on its own, then the sections.
  const home = (
    <section className={styles.group}>
      <ul>
        <li>
          <Link href="/staff" className={styles.page} aria-current={current === "home" ? "page" : undefined}>
            <NavIcon id="home" />
            <span className={styles.label}>{staffCopy.nav.home}</span>
          </Link>
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
            <Link href={page.href} className={styles.page} aria-current={page.id === current ? "page" : undefined}>
              <NavIcon id={page.id} />
              <span className={styles.label}>{staffCopy.nav[page.id]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  ));
  // On one line in the sidebar, cut short if it's long: the whole address on hover.
  const who = (
    <span className={styles.who} title={email}>
      {email}
    </span>
  );
  const others = sessions > 1 && (
    <Link href="/staff/sessions" className={styles.sessions} aria-current={current === "sessions" ? "page" : undefined}>
      {staffCopy.nav.sessions(sessions)}
    </Link>
  );
  return (
    <nav className={styles.nav} aria-label={staffCopy.nav.title}>
      {title}
      {/* Wider screens: the groups down the side, then who's logged in and the way out. */}
      <div className={styles.sidebar}>
        {home}
        {groups}
        <div className={styles.foot}>
          {who}
          <form method="post" action="/staff/api/logout">
            <button type="submit" className={styles.page}>
              <NavIcon id="logout" />
              <span className={styles.label}>{staffCopy.nav.logout}</span>
            </button>
          </form>
          {others}
          <NavFold />
        </div>
      </div>
      {/* A phone: a dropdown at the right of the bar, the current page with an arrow. */}
      <details key={path} className={styles.menu}>
        <summary>{current && (current === "sessions" ? staffCopy.sessions.title : staffCopy.nav[current])}</summary>
        <div>
          {home}
          {groups}
          <hr />
          {who}
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
