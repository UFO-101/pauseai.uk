import CopyLinkButton from "@/components/ui/CopyLinkButton";
import type { Person } from "@/lib/content/people";
import { renderBody } from "@/lib/storyRender";
import StoryBody from "@/components/people/StoryBody";
import ButtonRow from "@/components/ui/ButtonRow";
import styles from "./PersonStory.module.css";

// A person's story in full, with a button to copy its link.
export default function PersonStory({ person, slug }: { person: Person; slug: string }) {
  return (
    <section className={styles.band}>
      <div className="container">
        <StoryBody>{renderBody(person.paragraphs, true)}</StoryBody>
        <ButtonRow>
          <CopyLinkButton slug={slug} label="Share this story" />
        </ButtonRow>
      </div>
    </section>
  );
}
