import Link from "next/link";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Permission } from "@/lib/staff-permissions";
import { sectionsFor } from "@/lib/staff-sections";
import styles from "./StaffHome.module.css";

/**
 * The home page's body: the pages this staff member can see, in groups,
 * which extra permissions they have, or that they have none and whom to ask.
 */
export default function StaffHome({ permissions, admins }: { permissions: Permission[]; admins: string[] }) {
  return (
    <>
      <h1>{staffCopy.home.title}</h1>
      <p>
        {permissions.length > 0
          ? staffCopy.home.permissions(permissions.map((p) => staffCopy.permissions.names[p]).join(", "))
          : `${staffCopy.home.none} ${staffCopy.home.ask(admins.join(", "))}`}
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
