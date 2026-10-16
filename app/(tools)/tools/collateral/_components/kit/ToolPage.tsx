import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./ToolPage.module.css";

/** A volunteer tool's page: a link back to the tools, its title, a line about it, then the tool. */
export default function ToolPage({ title, lede, children }: { title: string; lede: ReactNode; children: ReactNode }) {
  return (
    <main className={styles.page}>
      <div className="container">
        <Link href="/tools" className={styles.back}>
          ← All tools
        </Link>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.lede}>{lede}</p>
        {children}
      </div>
    </main>
  );
}
