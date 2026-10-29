import Link from "next/link";
import { anchor, exampleKey } from "./anchors";
import type { Group } from "./types";
import styles from "./Gallery.module.css";

/**
 * One group's page: a way back to the index, a link to each component, then
 * every component and its variants. The storyboard pictures it whole
 * (tests/storyboard/gallery.spec.ts).
 */
export default function GalleryGroup({ group, browser = false }: { group: Group; browser?: boolean }) {
  return (
    <main className={`${styles.gallery} ${styles.group}`} data-gallery-group={group.id}>
      <div className="container">
        <Link className={styles.back} href="/gallery">
          ← Component gallery
        </Link>
        <h1 className={styles.title}>{group.title}</h1>
        <nav className={styles.index} aria-label="Components">
          {group.examples.map((example) => (
            <a key={example.file + example.name} href={`#${anchor(group.id, exampleKey(group, example))}`}>
              {example.name}
            </a>
          ))}
        </nav>
      </div>
      {group.examples.map((example) => (
        <section
          key={example.file + example.name}
          id={anchor(group.id, exampleKey(group, example))}
          className={styles.example}
        >
          <div className="container">
            <h2 className={styles.name}>
              {example.name} <span className={styles.file}>{example.file}</span>
            </h2>
          </div>
          {example.variants
            .filter((variant) => !(browser && variant.server))
            .map((variant) => (
              <div
                key={variant.label}
                id={anchor(group.id, exampleKey(group, example), variant.label)}
                className={styles.variant}
                data-gallery-variant={`${example.name}: ${variant.label}`}
              >
                <div className="container">
                  <p className={styles.label}>{variant.label}</p>
                </div>
                <div className={styles.stage}>{variant.render()}</div>
              </div>
            ))}
        </section>
      ))}
    </main>
  );
}
