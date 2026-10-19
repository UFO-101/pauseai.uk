import type { ReactNode } from "react";
import styles from "./Densities.module.css";

/**
 * An example twice, side by side (stacked on a phone): at the comfortable
 * density, the public site's, and at the compact one, the staff
 * interface's (styles/tokens.css). `children` is a function, so each copy
 * gets its own ids.
 */
export default function Densities({ children }: { children: (density: "comfortable" | "compact") => ReactNode }) {
  return (
    <div className={`container ${styles.densities}`}>
      <div>
        <p className={styles.name}>Comfortable</p>
        {children("comfortable")}
      </div>
      <div data-density="compact">
        <p className={styles.name}>Compact</p>
        {children("compact")}
      </div>
    </div>
  );
}
