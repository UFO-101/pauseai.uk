import Link from "next/link";
import type { PostSection } from "@/lib/content/blog";
import type { Briefing as BriefingData } from "@/lib/content/briefings";
import BriefingBox from "./BriefingBox";
import BriefingMasthead from "./BriefingMasthead";
import BriefingSheet from "./BriefingSheet";
import KeyStories from "./KeyStories";
import styles from "./Briefing.module.css";

/**
 * A briefing's page: the link back to the briefings, then the briefing on its
 * sheet: its masthead, the key stories in the headline's box, and the rest of
 * what it says.
 */
export default function Briefing({ briefing, section }: { briefing: BriefingData; section: PostSection }) {
  return (
    <div className={styles.page}>
      <div className={styles.back}>
        <Link href={`${section.path}/`}>{section.backLink}</Link>
      </div>
      <BriefingSheet>
        <BriefingMasthead briefing={briefing} section={section} />
        <BriefingBox title="Key stories this week" tone="headline">
          <KeyStories stories={briefing.keyStories} />
        </BriefingBox>
        {briefing.content}
      </BriefingSheet>
    </div>
  );
}
