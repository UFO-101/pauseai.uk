import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./CardIndex.module.css";

/** An index page of the volunteer area: a title and a lede over a grid of cards. */
export function CardIndex({ title, lede, children }: { title: string; lede: ReactNode; children: ReactNode }) {
  return (
    <main className={styles.page}>
      <div className="container">
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.lede}>{lede}</p>
        <ul className={styles.grid}>{children}</ul>
      </div>
    </main>
  );
}

/**
 * One card in the grid: a link with a heading, a line or two, and a call to
 * action. An `external` one opens in a new tab, and says so to screen readers.
 */
export function IndexCard({
  href,
  title,
  cta,
  external = false,
  children,
}: {
  href: string;
  title: string;
  cta: string;
  external?: boolean;
  children: ReactNode;
}) {
  const body = (
    <>
      <h2>{title}</h2>
      {children}
      <span className={styles.cta} aria-hidden="true">
        {cta}
      </span>
      {external && <span className={styles.srOnly}>(opens in a new tab)</span>}
    </>
  );
  return (
    <li>
      {external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={styles.card}>
          {body}
        </a>
      ) : (
        <Link href={href} className={styles.card}>
          {body}
        </Link>
      )}
    </li>
  );
}
