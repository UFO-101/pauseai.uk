import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import styles from "./StaffHeader.module.css";

/** The staff pages in the bar, in order. */
export type StaffPage = "politicians" | "letters" | "emails" | "import" | "history" | "changes";

const PAGES: [StaffPage, string][] = [
  ["politicians", "/staff/politicians"],
  ["letters", "/staff/letters"],
  ["emails", "/staff/blocked-addresses"],
  ["import", "/staff/import-data"],
  ["history", "/staff/import-history"],
  ["changes", "/staff/audit-log"],
];

/**
 * The staff interface's links, with the current page in bold rather than a
 * link, who's logged in, and the way out. Without `email`, on the login page,
 * just the title.
 */
export default function StaffHeader({ email, current }: { email?: string; current?: StaffPage }) {
  if (!email) {
    return (
      <header className={styles.header}>
        <span className={styles.title}>{staffCopy.nav.title}</span>
      </header>
    );
  }
  const links = PAGES.map(([page, href]) =>
    page === current ? (
      <strong key={page} aria-current="page">
        {staffCopy.nav[page]}
      </strong>
    ) : (
      <Link key={page} href={href}>
        {staffCopy.nav[page]}
      </Link>
    ),
  );
  return (
    <header className={styles.header}>
      <span className={styles.title}>{staffCopy.nav.title}</span>
      {/* A row of links, who's logged in and the way out; or on a phone, a dropdown at the right:
          the current page with an arrow, and under it the pages, the email and the way out. */}
      <nav>{links}</nav>
      <span className={styles.who}>{email}</span>
      <form className={styles.logout} method="post" action="/staff/api/logout">
        <Button variant="ghost" size="small" type="submit">
          {staffCopy.nav.logout}
        </Button>
      </form>
      <details className={styles.menu}>
        <summary>{current && staffCopy.nav[current]}</summary>
        <div>
          {links}
          <hr />
          <span className={styles.who}>{email}</span>
          <form method="post" action="/staff/api/logout">
            <button type="submit" className={styles.linkButton}>
              {staffCopy.nav.logout}
            </button>
          </form>
        </div>
      </details>
    </header>
  );
}
