import CopyLinkButton from "@/components/ui/CopyLinkButton";
import type { Person } from "@/lib/content/people";
import { renderBody } from "@/lib/storyRender";

// A person's story in full, with a button to copy its link.
export default function PersonStory({ person, slug }: { person: Person; slug: string }) {
  return (
    <section className="people-page-grid">
      <div className="container person-detail-grid">
        <div className="story-body">{renderBody(person.paragraphs, true)}</div>
        <div className="story-teaser-cta">
          <CopyLinkButton slug={slug} label="Share this story" />
        </div>
      </div>
    </section>
  );
}
