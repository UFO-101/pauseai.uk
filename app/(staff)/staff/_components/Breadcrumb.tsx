import Link from "next/link";
import styles from "./Breadcrumb.module.css";

/** Above a page's title, the way back to the list it belongs to: "← Supporters". */
export default function Breadcrumb({ href, children }: { href: string; children: string }) {
  return (
    <nav aria-label={children} className={styles.crumb}>
      <Link href={href}>
        <span aria-hidden="true">← </span>
        {children}
      </Link>
    </nav>
  );
}
