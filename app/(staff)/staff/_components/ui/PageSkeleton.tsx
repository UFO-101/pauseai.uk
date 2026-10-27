import { staffCopy } from "@/lib/content/staff-interface";
import styles from "./PageSkeleton.module.css";

/**
 * A staff page while it loads (each loading.tsx): grey bars where its
 * heading, its filters and a list's rows will be, beside the navigation,
 * which stays. It shows only once loading has taken a moment, so a quick
 * page doesn't flash it. A screen reader hears that the page is loading.
 */
export default function PageSkeleton() {
  return (
    <div className={styles.skeleton} aria-busy="true">
      <span className={styles.unseen} role="status">
        {staffCopy.loading}
      </span>
      <div className={styles.heading} />
      <div className={styles.filters} />
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className={styles.row} />
      ))}
    </div>
  );
}
