import Link from "next/link";
import type { PostSection } from "@/lib/content/blog";
import type { Briefing } from "@/lib/content/briefings";
import BriefingBox from "./BriefingBox";
import BriefingMasthead from "./BriefingMasthead";
import BriefingSheet from "./BriefingSheet";
import KeyStories from "./KeyStories";
import styles from "./BriefingCard.module.css";

/**
 * A briefing in the list of them, the whole card a link to it: the top of
 * its sheet, its masthead and the headlines of its key stories, and a word
 * to read the rest.
 */
export default function BriefingCard({ briefing, section }: { briefing: Briefing; section: PostSection }) {
  return (
    <Link href={`${section.path}/${briefing.slug}/`} className={styles.card}>
      <BriefingSheet as="div">
        <BriefingMasthead briefing={briefing} card />
        <BriefingBox title="Key stories this week" tone="headline">
          <KeyStories stories={briefing.keyStories} leads />
        </BriefingBox>
        <p className={styles.read}>Read the briefing →</p>
      </BriefingSheet>
    </Link>
  );
}
