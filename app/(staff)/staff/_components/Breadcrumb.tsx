import StaffLink from "./ui/StaffLink";
import styles from "./Breadcrumb.module.css";

/** Above a page's title, the way back to the list it belongs to: "← Supporters". */
export default function Breadcrumb({ href, children }: { href: string; children: string }) {
  return (
    <nav aria-label={children} className={styles.crumb}>
      <StaffLink href={href}>
        <span aria-hidden="true">← </span>
        {children}
      </StaffLink>
    </nav>
  );
}
