import { anchor, exampleKey } from "./anchors";
import type { Group } from "./types";
import styles from "./Gallery.module.css";

/**
 * Every component and its variants, a section each, grouped as the
 * storyboard pictures them (tests/storyboard/gallery.spec.ts).
 */
export default function Gallery({ groups, browser = false }: { groups: Group[]; browser?: boolean }) {
  return (
    <main className={styles.gallery}>
      <div className="container">
        <h1 className={styles.title}>Component gallery</h1>
        <nav className={styles.index} aria-label="Groups">
          {groups.map((group) => (
            <a key={group.id} href={`#${group.id}`}>
              {group.title}
            </a>
          ))}
        </nav>
      </div>
      {groups.map((group) => (
        <section key={group.id} id={group.id} className={styles.group} data-gallery-group={group.id}>
          <div className="container">
            <h2 className={styles.groupTitle}>{group.title}</h2>
          </div>
          {group.examples.map((example) => (
            <section
              key={example.file + example.name}
              id={anchor(group.id, exampleKey(group, example))}
              className={styles.example}
            >
              <div className="container">
                <h3 className={styles.name}>
                  {example.name} <span className={styles.file}>{example.file}</span>
                </h3>
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
        </section>
      ))}
    </main>
  );
}
