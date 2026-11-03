import Link from "next/link";
import type { PostSection } from "@/lib/content/blog";
import type { Briefing } from "@/lib/content/briefings";
import BriefingBox from "./BriefingBox";
import BriefingMasthead from "./BriefingMasthead";
import BriefingSheet from "./BriefingSheet";
import KeyStories from "./KeyStories";
import styles from "./BriefingCard.module.css";

/**
 * A briefing in the list of them: the top of its sheet, its masthead and the
 * headlines of its key stories, and a link to read the rest.
 */
export default function BriefingCard({ briefing, section }: { briefing: Briefing; section: PostSection }) {
  return (
    <BriefingSheet as="div">
      <BriefingMasthead briefing={briefing} section={section} linked />
      <BriefingBox title="Key stories this week" tone="headline">
        <KeyStories stories={briefing.keyStories} leads />
      </BriefingBox>
      <p className={styles.read}>
        <Link href={`${section.path}/${briefing.slug}/`} aria-label={`Read ${briefing.title}`}>
          Read the briefing →
        </Link>
      </p>
    </BriefingSheet>
  );
}
