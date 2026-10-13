import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import styles from "./staff.module.css";

/** The staff interface's links, who's logged in, and the way out. */
export default function StaffHeader({ email }: { email: string }) {
  return (
    <header className={styles.header}>
      <nav>
        <Link href="/staff">{staffCopy.nav.politicians}</Link>
        <Link href="/staff/politicians/new">{staffCopy.nav.add}</Link>
        <Link href="/staff/letters">{staffCopy.nav.letters}</Link>
        <Link href="/staff/mp-sync">{staffCopy.nav.syncs}</Link>
        <Link href="/staff/import">{staffCopy.nav.import}</Link>
        <Link href="/staff/changes">{staffCopy.nav.changes}</Link>
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
