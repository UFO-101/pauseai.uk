import type { ReactNode } from "react";
import PageIntro from "./PageIntro";
import styles from "./PageTitle.module.css";

/**
 * A staff page's title, with its subheading right under it if it has one, and
 * the page's main button at the right, the one thing it's there to start (New
 * mailing): first seen, and in the same place however long the page below it
 * grows. Anything else for the whole page, such as Download, goes before it,
 * in `action` too. On a phone the buttons wrap under the title.
 */
export default function PageTitle({
  action,
  intro,
  children,
}: {
  action: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.title}>
      <div className={styles.words}>
        <h1>{children}</h1>
        {intro && <PageIntro>{intro}</PageIntro>}
      </div>
      <div className={styles.actions}>{action}</div>
    </div>
  );
}
