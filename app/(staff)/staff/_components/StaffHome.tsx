import Link from "next/link";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Permission } from "@/lib/staff-permissions";
import { sectionsFor } from "@/lib/staff-sections";
import styles from "./StaffHome.module.css";

type Props = {
  /** Whether they have an account. Without one: just whom to ask. */
  account: boolean;
  permissions: Permission[];
  /** The admins, to ask. */
  admins: string[];
};

/**
 * The home page's body: without an account, whom to ask for one; with
 * one, which permissions they have, or that they have none, and the pages
 * they can see, in groups.
 */
export default function StaffHome({ account, permissions, admins }: Props) {
  const who = admins.join(", ");
  if (!account) {
    return (
      <>
        <h1>{staffCopy.home.title}</h1>
        <p>
          {staffCopy.home.noAccount} {staffCopy.home.ask(who)}
        </p>
      </>
    );
  }
  return (
    <>
      <h1>{staffCopy.home.title}</h1>
      <p>
        {permissions.length > 0
          ? staffCopy.home.permissions(permissions.map((p) => staffCopy.accounts.names[p]).join(", "))
          : `${staffCopy.home.none} ${staffCopy.home.ask(who)}`}
      </p>
      <div className={styles.sections}>
        {sectionsFor(permissions).map((section) => (
          <section key={section.id} aria-labelledby={`section-${section.id}`}>
            <h2 id={`section-${section.id}`}>{staffCopy.nav.sections[section.id]}</h2>
            <ul>
              {section.pages.map((page) => (
                <li key={page.id}>
                  <Link href={page.href}>{staffCopy.nav[page.id]}</Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
