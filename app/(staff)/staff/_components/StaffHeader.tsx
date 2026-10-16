import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import styles from "./staff.module.css";

/** The staff pages in the bar, in order. */
export type StaffPage = "politicians" | "letters" | "import" | "check" | "changes";

const PAGES: [StaffPage, string][] = [
  ["politicians", "/staff/politicians"],
  ["letters", "/staff/letters"],
  ["import", "/staff/import-data"],
  ["check", "/staff/check-data"],
  ["changes", "/staff/audit-log"],
];

/** The staff interface's links, with the current page in bold rather than a link, who's logged in, and the way out. */
export default function StaffHeader({ email, current }: { email: string; current: StaffPage }) {
  return (
    <header className={styles.header}>
      <span className={styles.title}>{staffCopy.nav.title}</span>
      <nav>
        {PAGES.map(([page, href]) =>
          page === current ? (
            <strong key={page} aria-current="page">
              {staffCopy.nav[page]}
            </strong>
          ) : (
            <Link key={page} href={href}>
              {staffCopy.nav[page]}
            </Link>
          ),
        )}
      </nav>
      <span className={styles.who}>{staffCopy.nav.signedInAs(email)}</span>
      <form method="post" action="/staff/api/logout">
        <Button variant="ghost" size="small" type="submit">
          {staffCopy.nav.logout}
        </Button>
      </form>
    </header>
  );
}
