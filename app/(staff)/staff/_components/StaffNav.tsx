import Link from "next/link";
import Brand from "@/components/layout/Brand";
import { Button } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Permission } from "@/lib/staff-permissions";
import { sectionsFor, type StaffPageId } from "@/lib/staff-sections";
import styles from "./StaffNav.module.css";

/** The pages the navigation can mark as current: the home page, or any page in a group. */
export type StaffPage = "home" | StaffPageId;

type Props = {
  /** Who's logged in. Without it, on the login page, just the title. */
  email?: string;
  /** Whether they have an account. Without one there are no groups to show, only who they are and the way out. */
  account?: boolean;
  /** Their permissions, which decide the groups they see. */
  permissions?: Permission[];
  current?: StaffPage;
};

/**
 * The staff interface's navigation: a sidebar with the pages in groups, the
 * current one marked but still a link, so it's the way back from a page
 * under it; who's logged in and the way out; on a phone, a bar with the
 * current page's name opening the same as a dropdown. A group shows only
 * to those with its permission. The logo at the top is the way to the home
 * page.
 */
export default function StaffNav({ email, account = false, permissions = [], current }: Props) {
  // The logo: the way home, except at home.
  const title = (
    <div className={styles.title}>
      <Brand href={current === "home" ? undefined : "/staff"} />
    </div>
  );
  if (!email) {
    return (
      <div className={styles.bar}>
        <Brand />
      </div>
    );
  }

  const groups = (account ? sectionsFor(permissions) : []).map((section) => (
    <section key={section.id} className={styles.group}>
      <h2>{staffCopy.nav.sections[section.id]}</h2>
      <ul>
        {section.pages.map((page) => (
          <li key={page.id}>
            <Link href={page.href} aria-current={page.id === current ? "page" : undefined}>
              {staffCopy.nav[page.id]}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  ));
  const who = <span className={styles.who}>{email}</span>;
  return (
    <nav className={styles.nav} aria-label={staffCopy.nav.title}>
      {title}
      {/* Wider screens: the groups down the side, then who's logged in and the way out. */}
      <div className={styles.sidebar}>
        {groups}
        <div className={styles.foot}>
          {who}
          <form method="post" action="/staff/api/logout">
            <Button variant="ghost" size="small" type="submit">
              {staffCopy.nav.logout}
            </Button>
          </form>
        </div>
      </div>
      {/* A phone: a dropdown at the right of the bar, the current page with an arrow. */}
      <details className={styles.menu}>
        <summary>{current && staffCopy.nav[current]}</summary>
        <div>
          {groups}
          <hr />
          {who}
          <form method="post" action="/staff/api/logout">
            <button type="submit" className={styles.linkButton}>
              {staffCopy.nav.logout}
            </button>
          </form>
        </div>
      </details>
    </nav>
  );
}
