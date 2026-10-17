import type { Person } from "@/lib/content/people";
import { avatarFallback, parseCssStyle } from "@/lib/storyRender";
import styles from "./Avatar.module.css";

/**
 * A person's round photo, or their initials (the pause symbol if they gave
 * no name). `large` for the top of their own page.
 */
export default function Avatar({ person, large = false }: { person: Person; large?: boolean }) {
  const className = `${styles.avatar} ${large ? styles.large : styles.small}`;
  return person.imageSrc ? (
    <div
      className={className}
      style={{ backgroundImage: `url("${person.imageSrc}")`, ...parseCssStyle(person.imageStyle ?? "") }}
    ></div>
  ) : (
    <div className={className} aria-hidden="true">
      {avatarFallback(person.name)}
    </div>
  );
}
