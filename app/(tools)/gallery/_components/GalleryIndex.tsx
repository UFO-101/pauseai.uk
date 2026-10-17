import Link from "next/link";
import type { Group } from "./types";
import styles from "./Gallery.module.css";

/** The gallery's front page: a card for each group, with what's in it, linking to its page. */
export default function GalleryIndex({ groups }: { groups: Group[] }) {
  return (
    <main className={styles.gallery}>
      <div className="container">
        <h1 className={styles.title}>Component gallery</h1>
        <ul className={styles.cards}>
          {groups.map((group) => {
            const variants = group.examples.reduce((sum, example) => sum + example.variants.length, 0);
            return (
              <li key={group.id}>
                <Link className={styles.card} href={`/gallery/${group.id}`}>
                  <span className={styles.cardTitle}>{group.title}</span>
                  <span className={styles.count}>
                    {group.examples.length} components, {variants} variants
                  </span>
                  <span className={styles.names}>{group.examples.map((example) => example.name).join(", ")}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
