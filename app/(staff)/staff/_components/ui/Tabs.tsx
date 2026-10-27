import ListLink from "./ListLink";
import styles from "./Tabs.module.css";

export type Tab = { key: string; label: string; href: string };

/**
 * A row of links, one of which is chosen: views of one list, such as its
 * houses. The chosen one is underlined and marked as the page. It scrolls
 * sideways on a phone rather than wrapping.
 */
export default function Tabs({ label, tabs, current }: { label: string; tabs: Tab[]; current: string }) {
  return (
    <nav aria-label={label} className={styles.tabs}>
      {tabs.map((tab) => (
        <ListLink key={tab.key} href={tab.href} aria-current={tab.key === current ? "page" : undefined}>
          {tab.label}
        </ListLink>
      ))}
    </nav>
  );
}
