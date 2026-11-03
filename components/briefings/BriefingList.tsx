import type { PostSection } from "@/lib/content/blog";
import type { Briefing } from "@/lib/content/briefings";
import BriefingCard from "./BriefingCard";
import styles from "./BriefingList.module.css";

/** Every briefing, in the order given (newest first), each the top of its sheet. */
export default function BriefingList({ briefings, section }: { briefings: Briefing[]; section: PostSection }) {
  return (
    <ol className={styles.list}>
      {briefings.map((briefing) => (
        <li key={briefing.slug}>
          <BriefingCard briefing={briefing} section={section} />
        </li>
      ))}
    </ol>
  );
}
